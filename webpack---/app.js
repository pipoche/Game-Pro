import {
    SoundObject
} from "../_common/scripts/soundManager";
import "./style.scss";
import {
    GameView
} from "./views/game.view";
import {
    HistoryView
} from "./views/history.view";

void(function IcefieldGame() {
    const $betAmount = $("input[name=bet-amount]").focus(function() {
        $(this).select();
    });
    const $betButton = $(".bet-button");
    const $cashoutBtn = $(".cashout-button");
    const $iceFieldType = $("#iceFieldType");
    const $betWrapper = $(".bet-wrapper");
    const $iceFieldTypeWrapper = $(".ice-field-type-wrapper");
    const $randomStepBoxWrapper = $(".random-step-box");
    const $gameCanvas = $("#gameCanvas");

    const FIELD_TYPES = [{
            l: 3,
            w: 2
        },
        {
            l: 6,
            w: 3
        },
        {
            l: 9,
            w: 4
        },
        {
            l: 12,
            w: 5
        },
        {
            l: 15,
            w: 6
        },
    ];

    let currentBet = null;
    let gameView = null;

    let waitingStepResponse = false;

    let selectedIceFieldTypeIndex = 0;
    let rowDimmension = 9;
    let columnDimmension = 4;

    UGG.initAsync({
            GameName: "icefield",
            DisplayName: "Icefield",
        })
        .then(() => {
            initDom();
            initSounds();
            initDomEvents();
            initEventEmitters();
        })
        .catch(UI.drawError);

    function initDom() {
        gameView = new GameView(document.getElementById("gameCanvas"), rowDimmension, columnDimmension);
    }

    function initSounds() {
        HowlerSoundManager.addSounds([
            new SoundObject("icefield-money-pickup", "icefield/assets/sounds/icefield-money-pickup.wav"),
            new SoundObject("icefield-lose", "icefield/assets/sounds/icefield-lose.wav"),
            new SoundObject("icefield-step-1", "icefield/assets/sounds/icefield-step-1.wav"),
        ]);
    }

    function initDomEvents() {
        $betButton.on("click", function() {
            // console.log("make bet needed");
            var betAmount = parseFloat($betAmount.val());
            if (parseFloat(betAmount.toFixed(10)) < UGG.getBetLimits().MinBet) {
                return;
            }

            if (betAmount > UGG.getActiveWallet().Amount) {
                UI.showInsufficientBalance(true);
                return;
            }

            MakeBetAsync().catch((err) => {
                UI.drawError(err);

                $betButton.removeClass("loading");
                let errorKey = "can_not_make_bet";
                if (typeof err.message === "string") {
                    errorKey = err.message;
                } else if (typeof err.DBError === "string") {
                    errorKey = err.DBError;
                }

                let errorText = TRANS.byAnyKey(`error_${errorKey}`);

                $(".error-wrapper").find(".error").html(errorText).end().show();

                setTimeout(function() {
                    $(".error-wrapper").hide().find(".error").html("");
                }, 5000);
            });

            showWinningPopup(false);
        });
        $cashoutBtn.on("click", function() {
            // console.log("cachout needed");
            $cashoutBtn.addClass("loading");

            UGG.createGameStepAsync({
                    BetID: currentBet.GUID,
                    Params: {},
                })
                .then((resp) => {
                    $cashoutBtn.removeClass("loading");

                    cashoutResponse(resp.Bet);
                })
                .catch(UI.drawError);
        });
        $gameCanvas.on("wheel", function(event) {
            event.preventDefault();

            // let scrollX =
            //   $icesContainer.scrollLeft() +
            //   (event.originalEvent.deltaY < 0 ? -30 : 30);

            // scrollIceContainer(scrollX);
            gameView.scrollGame(event.originalEvent.deltaY < 0 ? -1 : 1);
        });

        let lastTouchLocation = 0;
        $gameCanvas.on("touchstart", function(e) {
            lastTouchLocation = e.touches[0].clientX;
        });
        $gameCanvas.on("touchmove", function(e) {
            gameView.scrollGameBy((e.touches[0].clientX - lastTouchLocation) * 10);
            lastTouchLocation = e.touches[0].clientX;
        });
        $("#makeRandomStep").on("click", () => {
            if (waitingStepResponse == true || !currentBet || currentBet.Finished == true) return;

            const currentRowIndex = getCurrentRowIndex(currentBet);

            CANVAS_EMITTER.emit(CANVAS_EMITTER.OPEN_ICE_BOX, {
                rowid: currentRowIndex,
                colid: UI.getRandomInt(0, columnDimmension),
            });
        });

        $betAmount.on("change", () => {
            $betAmount.val(parseFloat($betAmount.val()).toFixed(2));
            $(".bet-wrapper-with-overlay .input-overlay .input-val").text($betAmount.val());
            $(".bet-wrapper-with-overlay .input-overlay .input-val-ending").text(UGG.getActiveWallet().CurrencyCode);

            updateProfitWrapperData();
        });

        $(".ice-field-type-wrapper .input-btn.minus").on("click", function() {
            if (currentBet && !currentBet.Finished) return;

            selectedIceFieldTypeIndex = Math.max(0, --selectedIceFieldTypeIndex);
            // console.log("ice field type change", selectedIceFieldTypeIndex);

            rowDimmension = FIELD_TYPES[selectedIceFieldTypeIndex].l;
            columnDimmension = FIELD_TYPES[selectedIceFieldTypeIndex].w;
            showIceFieldType();

            gameView.updateBoxDimensions(rowDimmension, columnDimmension, calculateAllCoefs());

            updateProfitWrapperData();
        });

        $(".ice-field-type-wrapper .input-btn.plus").on("click", function() {
            if (currentBet && !currentBet.Finished) return;

            selectedIceFieldTypeIndex = Math.min(4, ++selectedIceFieldTypeIndex);
            // console.log("ice field type change", selectedIceFieldTypeIndex);

            rowDimmension = FIELD_TYPES[selectedIceFieldTypeIndex].l;
            columnDimmension = FIELD_TYPES[selectedIceFieldTypeIndex].w;
            showIceFieldType();

            gameView.updateBoxDimensions(rowDimmension, columnDimmension, calculateAllCoefs());

            updateProfitWrapperData();
        });

        window.onresize = () => {
            onResize();
        };
    }

    function initEventEmitters() {
        //
        CANVAS_EMITTER.on(CANVAS_EMITTER.RESOURCES_LOADED, (data) => {
            // console.log("canvas resources loaded");

            currentBet = UGG.getGameState() ? .Bet;

            $betAmount.trigger("change");
            toggleButtons();

            if (currentBet) {
                let betAmount = GetNumStr(currentBet.BetAmount);
                $betAmount.val(betAmount).trigger("change");

                rowDimmension = currentBet.Params.l;
                columnDimmension = currentBet.Params.w;
                calculateSelectedIceFieldTypeIndex(rowDimmension, columnDimmension);
            } else {
                // if new user detected
                rowDimmension = 9;
                columnDimmension = 4;
                calculateSelectedIceFieldTypeIndex(rowDimmension, columnDimmension);

                gameView.updateBoxDimensions(rowDimmension, columnDimmension, calculateAllCoefs());
                onResize();
                return;
            }

            updateProfitWrapperData();
            setCashoutAmount();

            gameView.updateBoxDimensions(rowDimmension, columnDimmension, calculateAllCoefs());
            gameView.drawState(currentBet);

            onResize();
        });

        CANVAS_EMITTER.on(CANVAS_EMITTER.OPEN_ICE_BOX, (data) => {
            if (!currentBet || currentBet.Finished == true) return;

            if (waitingStepResponse == true) return;

            const currentRowIndex = getCurrentRowIndex(currentBet);
            if (currentRowIndex != data.rowid) return;

            waitingStepResponse = true;
            MakeStep(currentBet.GUID, {
                    x: data.rowid,
                    y: data.colid,
                })
                .then((result) => {
                    // console.log(result);
                    waitingStepResponse = false;
                })
                .catch((err) => {
                    waitingStepResponse = false;
                    UI.drawError(err);
                });
        });
    }

    function createGameResponse(bet) {
        // console.log("icefiled - make bet result: ", bet);

        currentBet = bet;
        toggleButtons();

        rowDimmension = currentBet.Params.l;
        columnDimmension = currentBet.Params.w;
        calculateSelectedIceFieldTypeIndex(rowDimmension, columnDimmension);

        updateProfitWrapperData();
        setCashoutAmount();

        gameView.updateBoxDimensions(rowDimmension, columnDimmension, calculateAllCoefs());
        gameView.startNewGame();
    }

    function stepResponse(bet) {
        // console.log("icefiled - step result: ", bet);
        currentBet = bet;

        toggleButtons();
        if (bet.Finished) {
            const currentRowIndexByOpening = getCurrentRowIndexByOpening(currentBet);

            if (currentBet.CurrentState.bn[currentRowIndexByOpening].m == currentBet.CurrentState.bn[currentRowIndexByOpening].o) {} else {
                showWinningPopup(true, currentBet.WinAmount, currentBet.CurrencyCode);
            }

            if (currentBet.WinAmount > 0) {
                HowlerSoundManager.play("icefield-money-pickup", true);
            } else {
                HowlerSoundManager.play("icefield-lose", true);
            }
        } else {
            setCashoutAmount();

            HowlerSoundManager.play("icefield-step-1", true);
        }

        updateProfitWrapperData();

        gameView.stepResponse(currentBet);
    }

    function setCashoutAmount() {
        if (currentBet.Finished) {
            $(".cashout-button .button-cashout-amount").text("");
            $(".cashout-button span.button-cashout-currency").text("");
            return;
        }

        const totalAmount = getTotalProfitAmount();

        $(".cashout-button .button-cashout-amount").text(`${totalAmount.toFixed(2)}`);
        $(".cashout-button span.button-cashout-currency").text(currentBet.CurrencyCode);
    }

    function cashoutResponse(bet) {
        // console.log("icefiled - cashout result: ", bet);
        currentBet = bet;
        toggleButtons();

        if (currentBet.WinAmount > 0) {
            showWinningPopup(true, currentBet.WinAmount, currentBet.CurrencyCode);
            HowlerSoundManager.play("icefield-money-pickup", true);
        }

        gameView.finishGame(currentBet);
    }

    function calculateAllCoefs() {
        const coefs = [];

        for (let i = 0; i < rowDimmension; i++) {
            // coefs.push(Math.floor(calculateCoef(i) * 100) / 100);
            coefs.push(calculateCoef(i));
        }

        return coefs;
    }

    function calculateCoef(rowid) {
        return UGG.getGameState() ? .RTP * Math.pow(columnDimmension / (columnDimmension - 1), rowid + 1);

        // if (!currentBet) return 0;

        // return (
        //   currentBet.CurrentState.sc *
        //   Math.pow(columnDimmension / (columnDimmension - 1), rowid + 1)
        // );
    }
    // function scrollIceContainer(scrollPosition, animDuration = 0) {
    //   setTimeout(() => {
    //     $icesContainer.animate(
    //       { scrollLeft: scrollPosition - (animDuration == 0 ? 0 : 100) },
    //       animDuration
    //     );
    //   }, 0);
    // }
    function calculateCurrentCoef() {
        var currentRowid = getCurrentRowIndexByOpening(currentBet);
        return calculateCoef(currentRowid);
    }

    function calculateNextCoef() {
        const nextRowid = getCurrentRowIndex(currentBet);
        return calculateCoef(nextRowid);
    }

    function updateProfitWrapperData() {
        if (!currentBet) return;

        const nextProfitStr = getNextProfitAmount() + " " + `<b>${currentBet.CurrencyCode}</b>`;
        // const nextCoef = Math.floor(calculateCoef(getCurrentRowIndex(currentBet)) * 100) / 100;
        const nextCoef = GetNumStr(calculateCoef(getCurrentRowIndex(currentBet)));
        $(".next-profit .profit-coef").text(`${nextCoef}x`);
        $(".next-profit .profit-amount").html(nextProfitStr);

        const totalProfitStr = (currentBet.Finished ? $betAmount.val() : getTotalProfitAmount()) + ` <b>${currentBet.CurrencyCode}</b>`;
        const currentRowIndex = currentBet.Finished ? -1 : getCurrentRowIndexByOpening(currentBet);
        // const totalCoef = Math.floor(calculateCoef(currentRowIndex) * 100) / 100;
        const totalCoef = GetNumStr(calculateCoef(currentRowIndex));
        $(".total-profit .profit-coef").text(`${currentRowIndex < 0 ? "1.00" : totalCoef}x`);
        $(".total-profit .profit-amount").html(totalProfitStr);
    }

    function calculateSelectedIceFieldTypeIndex(rowCount, colCount) {
        for (let i = 0; i < FIELD_TYPES.length; i++) {
            if (FIELD_TYPES[i].l == rowCount && FIELD_TYPES[i].w == colCount) {
                selectedIceFieldTypeIndex = i;
                break;
            }
        }
        showIceFieldType();
    }

    function showIceFieldType() {
        $iceFieldType.find("li").removeClass("active").eq(selectedIceFieldTypeIndex).addClass("active");
    }

    function toggleButtons() {
        if (!currentBet) {
            $betButton.show();
            $cashoutBtn.hide();

            $betButton.removeAttr("disabled");
            $cashoutBtn.attr("disabled");

            $betWrapper.removeClass("disabled");
            $iceFieldTypeWrapper.removeClass("disabled");
            $randomStepBoxWrapper.addClass("disabled");
        } else {
            if (currentBet.Finished == true) {
                $betButton.show();
                $cashoutBtn.hide();

                $betButton.removeAttr("disabled");
                $cashoutBtn.attr("disabled");

                $betWrapper.removeClass("disabled");
                $iceFieldTypeWrapper.removeClass("disabled");
                $randomStepBoxWrapper.addClass("disabled");
            } else {
                $betButton.hide();
                $cashoutBtn.show();

                $betButton.attr("disabled");
                $cashoutBtn.removeAttr("disabled");

                $betWrapper.addClass("disabled");
                $iceFieldTypeWrapper.addClass("disabled");
                $randomStepBoxWrapper.removeClass("disabled");
            }
        }
    }

    function getNextProfitAmount() {
        // let profitAmount = Math.floor(calculateNextCoef() * currentBet.BetAmount * 100) / 100;

        const betAmount = currentBet.Finished ? $betAmount.val() : currentBet.BetAmount;

        let profitAmount = GetNumStr(calculateNextCoef() * betAmount);

        if (profitAmount < betAmount) profitAmount = betAmount;

        profitAmount = Math.max(profitAmount, betAmount);

        return profitAmount;
    }

    function getTotalProfitAmount() {
        // let profitAmount = Math.floor(calculateCurrentCoef() * currentBet.BetAmount * 100) / 100;
        let profitAmount = GetNumStr(calculateCurrentCoef() * currentBet.BetAmount);

        if (profitAmount < currentBet.BetAmount) profitAmount = currentBet.BetAmount;

        profitAmount = Math.max(profitAmount, currentBet.BetAmount);

        return profitAmount;
    }

    function getCurrentRowIndex(currentBet) {
        let currentRowIndex = 0;
        for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
            if (currentBet.CurrentState.bn[i].m == null || currentBet.CurrentState.bn[i].m == undefined) {
                currentRowIndex = i;
                break;
            }
        }
        return currentRowIndex;
    }

    function getCurrentRowIndexByOpening(currentBet) {
        let currentRowIndex = -1;
        for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
            if (currentBet.CurrentState.bn[i].o == null || currentBet.CurrentState.bn[i].o == undefined) {
                break;
            }
            currentRowIndex = i;
        }
        return currentRowIndex;
    }

    function showWinningPopup(show, winAmount = 0, winCurrency = "") {
        if (show) {
            $("#winningPopupWrapper").css("opacity", "1");

            $("#winningPopupAmount .value").text(GetNumStr(winAmount));
            $("#winningPopupAmount .currency").text(winCurrency);

            setTimeout(() => {
                $("#winningPopupWrapper").css("opacity", "0");

                $("#winningPopupAmount .value").text("");
                $("#winningPopupAmount .currency").text("");
            }, 3000);
        } else {
            $("#winningPopupWrapper").css("opacity", "0");

            $("#winningPopupAmount .value").text("");
            $("#winningPopupAmount .currency").text("");
        }
    }

    const MakeBetAsync = async () => {
        return new Promise((resolve, reject) => {
            var betAmount = parseFloat($betAmount.val());
            if (!betAmount) {
                reject("invalid_betAmount");
                return false;
            }

            var params = {
                w: columnDimmension,
                l: rowDimmension,
            };
            $betButton.addClass("loading");
            UGG.createGameBetAsync({
                    BetAmount: betAmount,
                    Params: params,
                })
                .then((resp) => {
                    $betButton.removeClass("loading");

                    if (!resp) {
                        return;
                    }
                    createGameResponse(resp.Bet);
                    resolve();
                })
                .catch(reject);
        });
    };
    const MakeStep = async (betID, params) => {
        return new Promise((resolve, reject) => {
            UGG.createGameStepAsync({
                    BetID: betID,
                    //Amount: Amount,
                    Params: params,
                })
                .then(() => {
                    var bet = UGG.getGameState().Bet;
                    stepResponse(bet);
                    resolve(bet);
                })
                .catch(reject);
        });
    };

    function onResize() {
        const hPadding = window.innerWidth > 575 ? 30 : 0;
        const vPadding = window.innerWidth > 575 ? 30 : 0;

        gameView.resize($("#gameContainer").width() - hPadding, $("#gameContainer").height() - vPadding - (window.innerWidth > 767 ? 63 : 0));
    }
})();

window.drawBetHistoryView = (container, gameName, data) => {
    console.log(container, gameName, data);
    const historyApp = new HistoryView(container, data);
    return historyApp;
};
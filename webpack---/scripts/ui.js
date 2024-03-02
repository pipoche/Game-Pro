import CanvasEmitter from "./events/canvas.emitter";

window.CANVAS_EMITTER = new CanvasEmitter();
window.RESOURCES = {
    loaded: null,
    getTexture: (key) => {
        return RESOURCES.loaded[key].texture;
    },
    getTextures: (key) => {
        return Object.values(RESOURCES.loaded[key].textures);
    },
    getTexturesObject: (key) => {
        return RESOURCES.loaded[key].textures;
    },
};

window.UI = (function() {
    CANVAS_EMITTER.on(CANVAS_EMITTER.RESOURCES_LOADED, () => {
        UI.mainLoader(true);
    });

    const $main = $("main");
    let _gameName = null;
    let _gameDisplayName = null;

    let _initMyBetTabs = false;
    let _options = {
        StaticApiEndpoint: __STATIC_API__,
    };

    let _wallets;
    let _myBetsPrevTime = null;
    let $userWallets = $("#user-wallets");
    let $walletWrapper = $(".wallet-wrapper");
    let $walletFreebet = $("#wallet-freebet");
    let $betCounter = $("#current-bet-count");

    let _races = [];
    let _raceIndex = 0;
    let _raceCountDown = null;
    var _raceCounter = null;

    let myBetsHistoryObjects = [];

    const startTime = new Date();

    const betHistory = {
        SpecificCurrencyEnabledCompanies: ["31bets"],
        EnabledCurrencies: ["EUR", "CAD", "BRL"],
        CheckIfSkip: (betObj) => {
            try {
                const user = UGG.getUser();
                if (betHistory.SpecificCurrencyEnabledCompanies.indexOf(user.CompanyName.toLowerCase()) < 0) return false;

                if (betHistory.EnabledCurrencies.indexOf(betObj.CurrencyCode) < 0 && betObj.CurrencyCode != UGG.getActiveWallet().CurrencyCode) return true;

                return false;
            } catch (ex) {
                return false;
            }
        },
    };

    function RenderMyBetHistory(betObj) {
        let html = `<tr class='bet-history-item' betguid="${betObj.GUID}">`;

        betObj.StartTime = DateHandler.GetDateStr(DateHandler.GetUserTime(betObj.StartTime), "HH:mm:ss");
        betObj.FinishTime = DateHandler.GetDateStr(DateHandler.GetUserTime(betObj.FinishTime), "HH:mm:ss");

        html += `<td>${betObj.StartTime}</td>`;
        html += `<td class="amount">${betObj.BetAmount.toFixed(2)} <b>${betObj.CurrencyCode}</b></td>`;
        html += `<td class="amount ${betObj.WinAmount > 0 ? "win" : ""}">${GetNumStr(betObj.WinAmount)} <b>${betObj.CurrencyCode}</b></td>`;

        switch (_gameName) {
            case "aero":
            case "dino":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "ac") || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "c") || "-"}</td>`;

                const fn = getValueFromStateJSON(betObj.CurrentStateJson, "fn");
                html += `<td>${fn.length > 0 ? parseFloat(fn).toFixed(2) : "-"}</td>`;
                break;
            case "blackjack":
                // html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "RWC") || "-"}</td>`;
                let coef = GetFloatString(betObj.WinAmount / betObj.BetAmount);
                html += `<td>${coef > 0 ? coef : "-"}</td>`;
                break;
            case "teleport":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "RWC") || "-"}</td>`;
                break;
            case "chicken":
            case "rabbit":
            case "icefield":
            case "popcorn":
                html += `<td>${GetNumStr(getValueFromStateJSON(betObj.CurrentStateJson, "tc"), 2) || "-"}</td>`;
                break;
            case "plinko":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "W") || "-"}</td>`;
                break;
            case "ladder":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "W") || "-"}</td>`;
                break;
            case "limbo":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "tm") || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "n") || "-"}</td>`;
                break;
            case "frog":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "wc") || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "r", ["LOW", "MEDIUM", "HIGH"]) || "-"}</td>`;
                break;
            case "wheel":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "WC") || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "R", ["LOW", "MEDIUM", "HIGH"]) || "-"}</td>`;
                break;
            case "keno40":
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "rwc") || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "r", ["CLASSIC", "LOW", "MEDIUM", "HIGH"]) || "-"}</td>`;
                break;
            case "hilo":
                try {
                    // from hilo game app.js (copy/paste)
                    const stepAction = {
                        HIGH: 0,
                        LOW: 1,
                        SAME: 2,
                        HIGH_SAME: 3,
                        LOW_SAME: 4,
                        SKIP: 5,
                        CASHOUT: 6,
                    };
                    const stateArray = JSON.parse(betObj.CurrentStateJson).i;
                    let cardIndex = stateArray.length - 1;
                    let coef = stateArray
                        .slice(0, cardIndex)
                        .map(function getCoef(el) {
                            switch (el.a) {
                                case stepAction.HIGH:
                                    return el.cf.HIGH;
                                case stepAction.HIGH_SAME:
                                    return el.cf.HIGH_SAME;
                                case stepAction.SAME:
                                    return el.cf.SAME;
                                case stepAction.LOW_SAME:
                                    return el.cf.LOW_SAME;
                                case stepAction.LOW:
                                    return el.cf.LOW;
                                case stepAction.SKIP:
                                    return el.cf.SKIP;
                            }
                        })
                        .reduce((a, b) => a * b, 1);

                    coef = GetNumStr(coef);

                    betObj.Coef = coef;
                    betObj.Coef = betObj.Coef === null ? "" : betObj.Coef;
                } catch (e) {
                    betObj.Coef = "";
                }

                html += `<td>${betObj.Coef || "-"}</td>`;
                break;
            case "dice":
                html += `<td>${GetNumStr(getValueFromStateJSON(betObj.CurrentStateJson, "rwc")) || "-"}</td>`;
                html += `<td>${getValueFromStateJSON(betObj.CurrentStateJson, "wc") || "-"}</td>`;
                html += `<td>${parseInt(getValueFromStateJSON(betObj.CurrentStateJson, "rn")) || "-"}</td>`;
                break;
            case "roulette":
                let rcoef = GetFloatString(betObj.WinAmount / betObj.BetAmount);
                html += `<td>${rcoef > 0 ? rcoef : "-"}</td>`;
                break;
        }
        html + "</tr>";

        html += `<tr class="bet-history-content" betguid="${betObj.GUID}">
      <td colspan="10">
        <div class="bet-history-view" betguid="${betObj.GUID}">
        </div>
      </td>
    </tr>`;

        return html;
    }

    function getValueFromStateJSON(objJSON, key, from = null) {
        let val = "";

        try {
            val = JSON.parse(objJSON)[key];
            val = val == null ? "" : from == null ? val : from[val];
        } catch (e) {
            val = "";
        }

        return val;
    }

    function RenderMyBetsHistoryHeader(bets) {
        let html = "";

        let headerItems = [{
                trans_key: "common__start",
                text: "Start"
            },
            {
                trans_key: "common__bet",
                text: "Bet"
            },
            {
                trans_key: "common__win",
                text: "Win"
            },
        ];
        switch (_gameName) {
            case "aero":
            case "dino":
                headerItems.push({
                    trans_key: "common__auto_cashout",
                    text: "Auto Cashout"
                }, {
                    trans_key: "common__cashout",
                    text: "Cashout"
                }, {
                    trans_key: "common__final_number",
                    text: "Final Number"
                });
                break;
            case "blackjack":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                });
                break;
            case "roulette":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                });
                break;
            case "roulette_virtual":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                });
                break;
            case "chicken":
            case "rabbit":
            case "teleport":
            case "icefield":
            case "plinko":
            case "popcorn":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                });
                break;
            case "limbo":
                headerItems.push({
                    trans_key: "common__multiplier",
                    text: "Multiplier"
                }, {
                    trans_key: "common__number",
                    text: "Final Number"
                });
                break;
            case "keno40":
            case "wheel":
            case "frog":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                }, {
                    trans_key: "common__risk",
                    text: "Risk"
                });
                break;
            case "hilo":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                });
                break;
            case "dice":
                headerItems.push({
                    trans_key: "common__coef",
                    text: "Coef"
                }, {
                    trans_key: "common__multiplier",
                    text: "Multiplier"
                }, {
                    trans_key: "common__number",
                    text: "Final Number"
                });
                break;
        }

        html += "<tr>";
        for (let i = 0; i < headerItems.length; i++) {
            html += `<th><span data-trans="${headerItems[i].trans_key}">${headerItems[i].text}</span></th>`;
        }
        html += "</tr>";

        return html;
    }

    function RenderMyBetsHistory(bets) {
        let html = "";
        for (var x in bets) {
            html += RenderMyBetHistory(bets[x]);
        }
        return html;
    }

    function RenderMyBet(betObj) {
        let html = "";
        let coef = "";

        let winAmount = betObj.WinAmount;
        if (betObj.HiddenWinAmount) winAmount -= betObj.HiddenWinAmount;

        if (winAmount) {
            coef = GetFloatString(winAmount / betObj.BetAmount);
        }

        let iswin = winAmount > betObj.BetAmount ? "win" : "";
        let userTime = DateHandler.GetUserTime(betObj.BetTime);

        html += `
                <div bid='${betObj.GUID}' bam='${betObj.BetAmount}' class='tb-row ${iswin}'>
                    <div class="col-1" title="${DateHandler.GetDateStr(userTime, "HH:mm:ss")}">
                      ${DateHandler.GetDateStr(userTime, "HH:mm:ss")}
                    </div>
                    <div class='col-2 num-td' title="${GetNumStr(betObj.BetAmount)}">
                        <span>${GetNumStr(betObj.BetAmount)}</span>
                    </div>
                    <div class='col-3 num-td' title="${winAmount ? coef : "-"}">
                        <span class='won-amount'>${winAmount ? coef : "-"}</span>       
                    </div>
                    <div class='col-4 num-td win-td ${iswin ? "won-bet" : ""}'  title="${winAmount ? GetNumStr(winAmount) : "-"}">
                        <span class='won-amount'>${winAmount ? GetNumStr(winAmount) : "-"}</span>
                    </div>
                    <div style='col-5' title="${betObj.CurrencyCode}">
                      <span class='currency'>&nbsp;${betObj.CurrencyCode}</span>
                  </div>
                </div>`;

        if (DateHandler.GetDateStr(_myBetsPrevTime, "yyyyMMdd") != DateHandler.GetDateStr(userTime, "yyyyMMdd")) {
            html += `<div class='tb-row'>${DateHandler.GetDateStr(_myBetsPrevTime || userTime, "yyyy-MM-dd")}</div>`;
        }

        _myBetsPrevTime = userTime;

        return html;
    }

    function RenderMyBets(bets) {
        let html = "";
        for (var x in bets.reverse()) {
            html = RenderMyBet(bets[x]) + html;
        }

        return html;
    }

    function RenderPublicBets(bets, isCurrentBets = false) {
        let betsToDraw = [];
        let html = "";
        let user = UGG.getUser();

        if (isCurrentBets == true) {
            let currentBets = bets.filter((bet) => {
                return bet.Finished === false;
            });
            currentBets.sort((a, b) => (a.BetAmount < b.BetAmount ? 1 : b.BetAmount < a.BetAmount ? -1 : 0));
            let myCurrentBets = [];
            for (let i = currentBets.length - 1; i >= 0; i--) {
                if (currentBets[i].UserGUID == user.GUID) {
                    myCurrentBets.push(currentBets.splice(i, 1)[0]);
                    console.log(currentBets[i]);
                }
            }

            let finishedBets = bets.filter((bet) => {
                return bet.Finished === true;
            });
            finishedBets.sort((a, b) => (a.WinAmount < b.WinAmount ? 1 : b.WinAmount < a.WinAmount ? -1 : 0));
            let myFinishedBets = [];
            for (let i = finishedBets.length - 1; i >= 0; i--) {
                if (finishedBets[i].UserGUID == user.GUID) {
                    myFinishedBets.push(finishedBets.splice(i, 1)[0]);
                }
            }

            betsToDraw = myCurrentBets.concat(currentBets).concat(myFinishedBets).concat(finishedBets);

            // betsToDraw = currentBets.concat(finishedBets);
        } else {
            betsToDraw = bets;
        }

        for (var x in betsToDraw) {
            let betObj = betsToDraw[x];

            var coef = "";
            if (betObj.WinAmount) {
                coef = GetNumStr(betObj.WinAmount / betObj.BetAmount);
            }

            let iswin = betObj.WinAmount ? "win" : "";
            let ismybet = betObj.UserGUID == user.GUID ? "mybet" : "";
            let userName = ismybet ? user.UserName : betObj.DisplayUserName;

            if (betHistory.CheckIfSkip(betObj)) continue;

            html += `
                <div bid='${betObj.GUID}' bam='${betObj.BetAmount}' class='tb-row ${iswin} ${ismybet}'>
                    <div class="col-1" title="${userName || "-"}">
                      <span>${userName || "-"}</span>
                    </div>
                    <div class='col-2 num-td' title="${GetNumStr(betObj.BetAmount)}">
                        <span>${GetNumStr(betObj.BetAmount)}</span>
                    </div>
                    <div class='col-3 num-td' title="${betObj.WinAmount ? coef : "-"}">
                        ${betObj.WinAmount ? `<span class='coef'>${coef}</span>` : "-"}
                    </div>
                    <div class='col-4 num-td win-td ${betObj.WinAmount ? "won-bet" : ""}' title="${betObj.WinAmount ? GetNumStr(betObj.WinAmount) : "-"}">
                        ${betObj.WinAmount ? `<span class='won-amount'>${GetNumStr(betObj.WinAmount)}</span>` : "-"}
                    </div>
                    <div style='col-5' title="${betObj.CurrencyCode}">
                        <span class='currency'>&nbsp;${betObj.CurrencyCode}</span>
                    </div>
                </div>
            `;
        }

        return html;
    }

    function drawCurrentBets(bets) {
        if (bets.length) {
            drawCurrenBetCounter(bets.length);
        } else {
            drawCurrenBetCounter("");
        }

        $(`.current-bets-container .tb-body`).html(RenderPublicBets(bets, true));
    }

    function drawHighrollerBets(bets) {
        $(`.highroller-bets-container .tb-body`).html(RenderPublicBets(bets));
    }

    function drawMyBets(bets) {
        _myBetsPrevTime = null;
        $(`.my-bets-container .tb-body`).html(RenderMyBets(bets));
    }

    function drawMyNewBet(bet) {
        const html = RenderMyBet(bet);
        $(`.my-bets-container .tb-body`).prepend(html);
    }

    function redrawMyBet(bet) {
        const html = RenderMyBet(bet);
        let old = $(`.my-bets-container div[bid="${bet.GUID}"]`);
        if (!old) return;
        old.replaceWith(html);
    }

    function drawMyBetFromPool(bet) {
        const html = RenderMyBet(bet);
        $(`.my-bets-container .tb-body`).prepend(html);
    }

    function drawCurrenBetCounter(count) {
        $betCounter.html(count);
    }

    function RenderWalletRow(wallet) {
        let icon = wallet.BonusGUID ? '<i class="bonus">Bonus</i>' : "";
        if (wallet.FreeBet) {
            icon += '<i class="freebet">Freebet</i>';
        }

        // console.log('RenderWalletRow --> amount: ', wallet.Amount, 'hidden: ', wallet.HiddenAmount)

        let amount = wallet.Amount;
        if (wallet.HiddenAmount) {
            amount -= wallet.HiddenAmount;
            amount = Math.max(amount, 0);
        }

        // return `<b>${wallet.CurrencyCode}</b> ${icon} <span>${amount.toFixed(2)}</span>`;
        return `<b>${wallet.CurrencyCode}</b> ${icon} <span>${GetNumStr(amount)}</span>`;
    }

    const addHiddenAmount = (amount) => {
        let wallet = UGG.getActiveWallet();

        if (wallet.FreeBet) {
            return;
        }

        if (!wallet.HiddenAmount) wallet.HiddenAmount = 0;
        wallet.HiddenAmount += amount;

        if (amount == "remove") wallet.HiddenAmount = 0;
        // console.log('addHiddenAmount --> amount: ', wallet.Amount, 'hidden: ', wallet.HiddenAmount)

        window.parent.postMessage({
                event_id: "update_balance",
                data: {
                    amount: wallet.Amount,
                    visibleAmount: Math.max(wallet.Amount - wallet.HiddenAmount, 0),
                    hiddenamount: wallet.HiddenAmount,
                    currency: wallet.CurrencyCode,
                },
            },
            "*" //or "www.parentpage.com"
        );

        drawActiveWallet(wallet);
    };

    function RenderChatMessageRow(message) {
        var user = UGG.getUser();
        if (message.UserGUID == user.GUID) message.DisplayUserName = user.UserName;

        return `<li class='message-container'>
            <span class='sender-name'>${message.DisplayUserName}: </span>
            <span class='message'>${message.Message}</span>
        </li>`;
    }

    function drawChatMessage(msgObj) {
        var container = $(".chat-container");

        container.append(RenderChatMessageRow(msgObj));

        // container.scrollTop(container[0].scrollHeight);
        $(".chat-message-container").animate({
            scrollTop: $(".chat-container")[0].scrollHeight
        }, 500);
    }

    const drawChatHistory = (messages) => {
        if (!messages) return null;

        messages.sort(function(a, b) {
            return new Date(a.CreateTime) - new Date(b.CreateTime);
        });

        var html = "";
        messages.forEach((msg) => {
            html += RenderChatMessageRow(msg);
        });

        $(".chat-container").html(html);
        // container.scrollTop(container[0].scrollHeight);
        $(".chat-message-container").animate({
            scrollTop: $(".chat-container")[0].scrollHeight
        }, 500);
    };

    const drawUserWallets = (wallets) => {
        _wallets = wallets;
        let html = "<ul>";

        if (wallets && wallets.length > 1) {
            _wallets.forEach((wallet) => {
                html += `<li data-UniqueID='${wallet.UniqueID}'>${RenderWalletRow(wallet)}</li>`;
            });
            $(".wallet-wrapper").removeClass("single");
        } else {
            $(".wallet-wrapper").addClass("single");
        }

        html += "</ul>";

        $userWallets.html(html);
    };

    const drawActiveWallet = (wallet) => {
        let countFreeBets = 0;
        $("#active-wallet").html(RenderWalletRow(wallet));

        if (_wallets) {
            countFreeBets = _wallets.filter((q) => q.FreeBet).length;
        }

        if (_wallets && countFreeBets && !wallet.FreeBet) {
            $walletFreebet.find("i.freebet").html(countFreeBets).end().show();
        } else {
            $walletFreebet.find("i.freebet").html(countFreeBets).end().hide();
        }

        // $(".bet-amount .title").attr("data-currency", wallet.CurrencyCode);

        $(`#user-wallets [data-uniqueid="${wallet.UniqueID}"]`).remove();

        if (wallet.FreeBet) {
            console.log(wallet.FreeBet);

            $(".bet-wrapper input").val(wallet.FreeBet.MinBetAmount);
            validateBetInputButtonsView($(".bet-wrapper .input-amount"), wallet.FreeBet.MinBetAmount, wallet.FreeBet.MaxBetAmount);

            if (wallet.FreeBet.MinBetAmount == wallet.FreeBet.MaxBetAmount) {
                // $(".bet-wrapper").addClass("disabled");
                disableBetWrapper(true);

                $(".bet-wrapper").attr("freebet", true);
            }
        } else {
            if ($(".bet-wrapper").attr("freebet") == true) {
                $(".bet-wrapper").removeAttr("freebet");

                // $(".bet-wrapper").removeClass("disabled");
                disableBetWrapper(false);
            }
        }

        $(".bet-wrapper input").trigger("change");
        $("[dynamic-currency]").text(wallet.CurrencyCode);
    };

    const disableBetWrapper = (disable) => {
        if (disable) {
            $(".bet-wrapper").addClass("disabled");

            $(".bet-wrapper input").attr("disabled", "disabled");
        } else {
            $(".bet-wrapper").removeClass("disabled");

            $(".bet-wrapper input").attr("disabled", "disabled");
        }
    };

    const drawRace = () => {
        if (!_races.length) return;

        const user = UGG.getUser();
        const race = _races[_raceIndex];
        //const lang = UGG.lang();

        if (race.Banner) {
            $(".race-rating").css("background-image", "url(" + race.Banner.image + ")");
        }

        let date = new Date(race.EndTime);

        if (_raceCounter !== null) {
            _raceCounter.timer.stop();
        }

        _raceCounter = Tick.count.down(date);
        _raceCounter.onupdate = (value) => {
            _raceCountDown.value = value;
        };

        let index = 0;
        $(".race-rating table tbody").empty();
        for (var t = 0; t < race.Items.length; t++) {
            index++;
            let item = race.Items[t];

            if (item.UserGuid == user.GUID) item.UserName = user.UserName;

            $(".race-rating table tbody").append(
                `<tr>
              <td>${index}.</td>
              <td>${item.UserName || ""}</td>
              <td>${item.Points || ""}</td>
              <td>${item.RewardAmount} ${race.RewardCurrencyCode}</td>
            </tr>`
            );
        }

        for (var x = index; x <= 10; x++) {
            $(".race-rating table tbody").append(
                `<tr>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>`
            );
        }

        $(".race-rating table tbody").append(
            `<tr class="my-race" data-race-item-id="${race.RaceItemID}">
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>`
        );

        $(".race-rating").css("display", "flex").removeClass("loading");
    };

    $("div#user-wallets").on("click", "li", function() {
        UGG.setActiveWalletAsync($(this).data("uniqueid"));
    });

    UGG.on("user.wallets", function(wallets) {
        console.log("user.wallets", wallets);
        drawUserWallets(wallets);

        var wallet = UGG.getActiveWallet();
        $userWallets.removeClass("active");
        drawActiveWallet(wallet);
    });

    UGG.on("chat.message", drawChatMessage);

    UGG.on("game.state.set", function(state) {
        console.log("game.state.set", state);

        if (!_initMyBetTabs) {
            _initMyBetTabs = true;
            if (state.LiveTableID) {
                $main.addClass("live-table");

                $(".my-bets>.my-bets-header>.current-bets").click();
            } else {
                $(".my-bets>.my-bets-header>.my-bets").click();
            }
        }

        var limit = UGG.getBetLimits();

        $(".bet-limit-min").html(limit.MinBet.toFixed(2) + " " + `<b>${limit.CurrencyCode}</b>`);
        $(".bet-limit-max").html(limit.MaxBet.toFixed(2) + " " + `<b>${limit.CurrencyCode}</b>`);
        $(".bet-limit-max-profit").html(limit.MaxProfit.toFixed(2) + " " + `<b>${limit.CurrencyCode}</b>`);
        // $(".bet-limits-mobile .min-bet .amount").html(
        //   limit.MinBet.toFixed(2) + " " + `<b>${limit.CurrencyCode}</b>`
        // );
        // $(".bet-limits-mobile .max-bet .amount").html(
        //   limit.MaxBet.toFixed(2) + " " + `<b>${limit.CurrencyCode}</b>`
        // );

        if (state.FreeBets) {
            state.FreeBets.forEach((freeBet) => {});
        }

        // validate bet input
        setTimeout(() => {
            const betInputs = $('.bet-wrapper input[type="number"]');
            for (let i = 0; i < betInputs.length; i++) {
                const betInput = $(betInputs[i]);
                if (parseFloat(betInput.val()) < limit.MinBet) {
                    betInput.attr("value", limit.MinBet.toFixed(2));
                    betInput.val(limit.MinBet).trigger("change");
                }
                if (parseFloat(betInput.val()) > limit.MaxBet) {
                    betInput.attr("value", limit.MaxBet.toFixed(2));
                    betInput.val(limit.MaxBet).trigger("change");
                }
                validateBetInputButtonsView(betInput.closest(".input-amount"), limit.MinBet, limit.MaxBet);
            }
        }, 0);
    });

    UGG.on("game.races.set", function(races) {
        console.log("game.races.set", races);
        _races = races;

        if (_races.length > 1) {
            $(".race-nav").show();
        } else {
            $(".race-nav").hide();
        }

        $(".full-loader").remove();
        drawRace();
    });

    UGG.on("game.racepoint.set", function(items) {
        console.log("game.racepoint.set", items);

        let user = UGG.getUser();
        for (let i = 0; i < items.length; i++) {
            var $tr = $(`.my-race[data-race-item-id="${items[i].RaceItemID}"]`);

            const race = _races.find((x) => x.RaceItemID == items[i].RaceItemID);
            if (race && race.Items.some((q) => q.UserGuid == user.GUID)) {
                $tr.fadeTo(0, 0);
                continue;
            }

            var td = $tr.fadeTo(0, 1).find("td");
            $(td[0]).html(items[i].Place + ".");
            $(td[1]).html(user.UserName);
            $(td[2]).html(items[i].Points);

            if (items[i].RewardAmount) $(td[3]).html(items[i].RewardAmount);
        }
    });

    UGG.on("game.banner.set", function(banners) {
        console.log("game.banner.set", banners);

        $(".full-loader").remove();
        $(".banners-wrapper").css("display", "flex").removeClass("loading");
        if (banners && banners.length) {
            try {
                var opts = {
                    class: "banner",
                    target: "_blank",
                };

                if (banners[0].url && banners[0].url.length > 0) {
                    opts.href = banners[0].url;
                }

                $("<a>", opts)
                    .css("background-image", "url(" + banners[0].image + ")")
                    .appendTo(".banners-wrapper");
            } catch (e) {}
        }
    });

    UGG.on("game.unavailable_by_country.set", function(message) {
        $("#popups").addClass("country-restricted");
        $("body").addClass("disable-actions");
    });

    const handleRaceCountDownInit = (tick) => {
        _raceCountDown = tick;

        var locale = {
            //YEAR_PLURAL: 'Jaren',
            //YEAR_SINGULAR: 'Jaar',
            //MONTH_PLURAL: 'Maanden',
            //MONTH_SINGULAR: 'Maand',
            //WEEK_PLURAL: 'Weken',
            //WEEK_SINGULAR: 'Week',
            DAY_PLURAL: TRANS.byKey("common__ending_days", "DAYS"),
            //DAY_SINGULAR: 'Dag',
            HOUR_PLURAL: TRANS.byKey("common__ending_hours", "HOURS"),
            //HOUR_SINGULAR: 'Uur',
            MINUTE_PLURAL: TRANS.byKey("common__ending_minutes", "MINUTES"),
            //MINUTE_SINGULAR: 'Minuut',
            //SECOND_PLURAL: 'Seconden',
            //SECOND_SINGULAR: 'Seconde',
            //MILLISECOND_PLURAL: 'Milliseconden',
            //MILLISECOND_SINGULAR: 'Milliseconde'
        };

        for (var key in locale) {
            if (!locale.hasOwnProperty(key)) {
                continue;
            }
            tick.setConstant(key, locale[key]);
        }
    };

    const SendChatMessage = () => {
        var chatInp = $(".live-chat textarea[name=new-message]");
        var message = chatInp.val();

        if (!message) return;

        UGG.sendMessageAsync(message).then(() => {
            chatInp.val("");
        });
    };

    $(".live-chat form").on("submit", function(ev) {
        ev.preventDefault();

        SendChatMessage();
    });

    $(".live-chat form textarea").on("keydown", function(ev) {
        if (ev.keyCode != 13) return;
        ev.preventDefault();

        SendChatMessage();
    });

    $walletWrapper.hover(
        () => {
            $userWallets.addClass("active");
        },
        () => {
            $userWallets.removeClass("active");
        }
    );

    $walletFreebet.on("click", () => {
        $userWallets.toggleClass("active");
    });

    $walletWrapper.on("click", () => {
        $userWallets.toggleClass("active");
    });

    const lockWallets = () => {
        $walletWrapper.addClass("lock");
    };

    const unlockWallets = () => {
        $walletWrapper.removeClass("lock");
    };

    $("#racing-btn").on("click", () => {
        $("main").toggleClass("racing");
    });

    $("#race-close").on("click", () => {
        $("main").removeClass("racing");
    });

    $(".racing-btn-rightbar").on("click", () => {
        $("main").addClass("racing");
        $(".rightbar").addClass("hidden");
        $("main .right-section .section-body").removeClass("active");
    });

    $("#race-prev").on("click", () => {
        var drawIndex = Math.max(_raceIndex - 1, 0);

        if (drawIndex != _raceIndex) {
            _raceIndex = drawIndex;
            drawRace();
        }
    });

    $("#race-next").on("click", () => {
        var drawIndex = Math.min(_raceIndex + 1, _races.length - 1);

        if (drawIndex != _raceIndex) {
            _raceIndex = drawIndex;
            drawRace();
        }
    });

    $(".popup-close").on("click", function() {
        var $wrapper = $(this).closest(".popup-wrapper");
        $wrapper.hide();
    });

    function onRuleClick() {
        $("#popup-rules").find(".popup-body").end().fadeIn("fast");

        const limit = UGG.getBetLimits();
        $("#rulesPopupCurrency").text(limit.CurrencyCode);
        $("#rulesPopupMinBet").text(limit.MinBet.toFixed(2));
        $("#rulesPopupMaxBet").text(limit.MaxBet.toFixed(2));
        $("#rulesPopupMaxProfit").text(limit.MaxProfit.toFixed(2));

        // if not dino or aero
        if (_gameName !== "dino" && _gameName !== "aero") {
            $("#rulesRTP").text(`${TRANS.byAnyKey("rules_rtp")} ${UGG.getGameState().RTP * 100}%`);
        }
    }

    $(".rules-show").on("click", onRuleClick);
    $("#rules-wrapper").find(".link").on("click", onRuleClick);

    var $myBetsHistory = $("#popup-my-bets-history").find(".popup-body");

    $("#my-bets-history").on("click", function() {
        $(".rightbar").addClass("hidden");

        var from = new Date();
        from.setMonth(startTime.getMonth() - 3);
        $(".bets-history-from").val(from.toISOString().substr(0, 10));
        $(".bets-history-to").val(startTime.toISOString().substr(0, 10));

        $myBetsHistory.end().fadeIn("fast");

        $myBetsHistory.find("tbody").empty();
        UGG.getUserBetHistory().then((bets) => {
            myBetsHistoryObjects = bets;

            var html = RenderMyBetsHistory(bets);

            $myBetsHistory.find("tbody").html(html);

            $myBetsHistory.find("thead").html(RenderMyBetsHistoryHeader());
        });
    });

    $("#bet-history-filter").on("click", function() {
        $myBetsHistory.find("tbody").empty();
        var toDate = new Date($("#bet-history-to").val());
        toDate.setTime(toDate.getTime() + 24 * 60 * 60 * 1000);
        toDate = toDate.toISOString().substr(0, 10);
        UGG.getUserBetHistory({
            FromDate: $("#bet-history-from").val(),
            ToDate: toDate,
        }).then((bets) => {
            myBetsHistoryObjects = bets;

            var html = RenderMyBetsHistory(bets);

            $myBetsHistory.find("tbody").html(html);

            $myBetsHistory.find("thead").html(RenderMyBetsHistoryHeader());
        });
    });

    const historyApplications = [];
    $("#popup-my-bets-history.popup-wrapper").on("click", (e) => {
        const closestHistoryItem = $($(e.target).closest(".bet-history-item"));
        if (closestHistoryItem.length) {
            const betGuid = closestHistoryItem.attr("betguid");
            // console.log(betGuid);
            const historyContent = $(`.bet-history-content[betguid="${closestHistoryItem.attr("betguid")}"]`);
            const historyView = $(".bet-history-view", historyContent);

            if (historyContent.hasClass("visible")) {
                closestHistoryItem.removeClass("visible");
                historyContent.removeClass("visible");
                historyContent.height(0);
                for (let i = 0; i < historyApplications.length; i++) {
                    if (historyApplications[i].guid == betGuid) {
                        const appToRemove = historyApplications.splice(i, 1);
                        if (appToRemove.length) {
                            historyView.html("");
                            window.removeEventListener("resize", resizeHistoryViewCanvas);
                        }
                    }
                }
            } else {
                if (historyView.length && window.drawBetHistoryView) {
                    closestHistoryItem.addClass("visible");
                    historyContent.addClass("visible");
                    const historyBetData = myBetsHistoryObjects.filter((item) => item.GUID == betGuid)[0];
                    // console.warn(historyBetData);

                    historyApplications.push({
                        guid: betGuid,
                        app: window.drawBetHistoryView(historyView[0], _gameName, historyBetData)
                    });
                    window.addEventListener("resize", resizeHistoryViewCanvas);
                }
            }

            function resizeHistoryViewCanvas() {
                const historyItem = historyApplications.filter((item) => item.guid == betGuid);
                if (historyItem.length) {
                    if (historyItem[0].app) historyItem[0].app.resize();
                }
            }
        }
    });

    const drawError = (res, message) => {
        if (res && res.responseJSON && res.responseJSON.Error) {
            if (message) console.error(message, res.responseJSON.Data);
            else console.error(res.responseJSON.Data);
        } else {
            if (message) console.error(message, res);
            else console.error(res);
        }
    };

    const drawGameName = () => {
        const $container = $("header > .wrapper > .main-content");
        let $gameName = $container.find("div#game-name");

        if ($gameName.length) {
            $gameName.html(_gameDisplayName);
        } else {
            $gameName = $("<div>")
                .attr({
                    id: "game-name",
                })
                .html(_gameDisplayName)
                .prependTo($container);
        }
    };
    const drawBackToHomeButton = () => {
        const queryParams = UGG.queryString;
        if (!queryParams || (!queryParams.exit_url && queryParams.showbackbutton != "show")) {
            return;
        }

        const $container = $("header > .wrapper > .main-content");
        $container.addClass("with-back-button");

        const $backButton = $("<div>")
            .attr({
                id: "backToHome",
                class: "back-to-home",
            })
            .prependTo($container);
        $backButton.on("pointerdown", () => {
            if (queryParams.showbackbutton != undefined && queryParams.showbackbutton == "show") {
                try {
                    if (window.self !== window.top) {
                        window.parent.postMessage({
                                event: "BackEventFromGame",
                                game: _gameName,
                            },
                            "*" //or "www.parentpage.com"
                        );
                    }
                } catch (e) {}
            }

            if (queryParams.exit_url) {
                window.location.href = queryParams.exit_url;
            }
        });
    };
    const drawDepositButton = () => {
        const queryParams = UGG.queryString;
        if (queryParams.enable_deposit && queryParams.enable_deposit == "true") {
            $("#makeDepositButton").show();

            if (queryParams.deposit_url && queryParams.deposit_url != "") {
                $("#makeDepositButton a").attr("href", queryParams.deposit_url);
            } else {
                $("#makeDepositButton").on("pointerdown", () => {
                    console.error("listen from iframe this postMessage: ", `{event: MakeDeposit, game: _gamename}`, "end redirect me to correct deposit page");
                    try {
                        if (window.self !== window.top) {
                            window.parent.postMessage({
                                    event: "MakeDeposit",
                                    game: _gameName,
                                },
                                "*" //or "www.parentpage.com"
                            );
                        }
                    } catch (e) {}
                });
            }
        }
    };

    const CurrencySymbol = (code) => {
        switch (code) {
            case "USD":
                return "$";
            case "EUR":
                return "€";
            case "GEL":
                return "₾";
            default:
                return code;
        }
    };

    const mainLoader = function(hide) {
        if (hide) $("#main-loader").fadeOut(200);
        else $("#main-loader").show();
    };

    let $gameTime = $("<div>")
        .attr({
            id: "game-time",
        })
        .html("0")
        .appendTo($("header .game-time-wrapper"));

    setInterval(function() {
        if (window.location.href.indexOf("onyxion.games") < 0) {
            let gameTime = parseInt((new Date() - startTime) / 1000);

            var s = ((gameTime % 60) / 100).toFixed(2).split(".")[1];
            var m = (Math.floor((gameTime % 3600) / 60) / 100).toFixed(2).split(".")[1];
            var h = (Math.floor((gameTime % 216000) / 3600) / 100).toFixed(2).split(".")[1];

            $gameTime.html(`${h}:${m}:${s}`);
        } else {
            const dateNow = new Date();
            $gameTime.html(`${("0" + dateNow.getHours()).slice(-2)}:${("0" + dateNow.getMinutes()).slice(-2)}:${("0" + dateNow.getSeconds()).slice(-2)}`);
        }
    }, 1000);

    var secretStart = "";
    var secretStop = "";
    var secteAudioStart = "";
    var secteAudioStop = "";
    const startTransUI = () => {
        secretStart = "";

        $("body").addClass("trans-ui");

        $("[data-trans]").on("click", function() {
            navigator.clipboard.writeText($(this).data("trans").split("__")[1]);
            // alert("copied to clipboard", $(this).data("trans"));

            var $div = $("<div>")
                .attr({
                    class: "trans-wrapper",
                })
                .on("click", function() {
                    //$div.remove();
                });
            $div.appendTo($("body"));

            $div.html($(this).data("trans") + "<br><br>" + TRANS.byKey($(this).data("trans")));
        });
    };

    const stopTransUI = () => {
        $("body").removeClass("trans-ui");

        $("[data-trans]").off("click");
    };

    $(document).on("keyup", function(e) {
        if (e.which == 27) {
            $(".trans-wrapper").remove();
        }

        if (!e.shiftKey) return;

        if (e.which === 187) {
            secretStart += "+";
        } else {
            secretStart = "";
        }

        if (e.which === 189) {
            secretStop += "-";
        } else {
            secretStop = "";
        }

        if (secretStart === "+++") startTransUI();
        if (secretStop === "---") stopTransUI();

        if (e.which === 65) {
            secteAudioStart += "a";
        } else {
            secteAudioStart = "";
        }

        if (e.which === 81) {
            secteAudioStop += "q";
        } else {
            secteAudioStop = "";
        }
        if (secteAudioStart === "aaa") {
            $(".audio-controller-wrapper").show();
            updateAudioUploader();
        }

        if (secteAudioStop === "qqq") {
            $(".audio-controller-wrapper").hide();
        }
    });

    function init(gameKeyName, gameDisplayName) {
        _gameName = gameKeyName;
        _gameDisplayName = gameDisplayName || _gameName;
        drawGameName();
        drawBackToHomeButton();
        drawDepositButton();
        $("#popup-rules div[data-trans]").each((index, el) => {
            el = $(el);
            if (el.attr("data-trans").indexOf("common__") != 0) {
                el.attr("data-trans", `${_gameName}__${el.attr("data-trans")}`);
            }
        });

        PG.InitDom(gameKeyName);

        initGlobalListeners();
    }

    function initGlobalListeners() {
        $(".bet-wrapper .input-btn.minus").on("click", function(e) {
            const $closestInputAmount = $(this).closest(".input-amount");
            const $betAmount = $("input[name=bet-amount]", $closestInputAmount);
            const limits = UGG.getBetLimits();

            let val = parseFloat($betAmount.val());
            if (!val) return;

            if (val <= 1) {
                val = Math.round((val - limits.MinBet) * 1000) / 1000;
            } else {
                val = Math.round((val - UGG.getStepAmount(val, false)) * 1000) / 1000;
            }

            if (val < limits.MinBet) val = limits.MinBet;

            $betAmount.val(val).trigger("change");
            validateBetInputButtonsView($closestInputAmount);
        });
        $(".bet-wrapper .input-btn.plus").on("click", function(e) {
            const $closestInputAmount = $(this).closest(".input-amount");
            const $betAmount = $("input[name=bet-amount]", $closestInputAmount);
            const limits = UGG.getBetLimits();

            let val = parseFloat($betAmount.val());
            if (!val) return;

            if (val < 1) {
                val = Math.round((val + limits.MinBet) * 1000) / 1000;
            } else {
                val = Math.round((val + UGG.getStepAmount(val, true)) * 1000) / 1000;
            }

            if (val > limits.MaxBet) val = limits.MaxBet;

            $betAmount.val(val).trigger("change");
            validateBetInputButtonsView($closestInputAmount);
        });
        $(".bet-wrapper input[type='number']").on("focusout", function() {
            const val = $(this).val();
            if (val == "") {
                $(this).val(UGG.getBetLimits().MinBet).trigger("change");
            } else {
                if (parseFloat(val) < UGG.getBetLimits().MinBet) {
                    $(this).val(UGG.getBetLimits().MinBet).trigger("change");
                } else if (parseFloat(val) > UGG.getBetLimits().MaxBet) {
                    $(this).val(UGG.getBetLimits().MaxBet).trigger("change");
                }
            }

            validateBetInputButtonsView($(this).closest(".input-amount"));
        });
        $("input").keypress(function(e) {
            if (e.which == 13) {
                $(this).blur();

                validateBetInputButtonsView($(this).closest(".input-amount"));
            }
        });

        setTimeout(() => {
            onUIResize();
        }, 0);
        $(window).on("resize", (e) => {
            onUIResize(e);
        });

        $(".bet-wrapper .input-amount").on("click", (e) => {
            showMobileInputView(e, UGG.getBetLimits(), true);
        });
        $(".background", $mobileInputWrapper).on("click", (e) => {
            hideMobileInputView();
        });
        $("*[action]", $mobileInputWrapper).on("click", (e) => {
            mobileInputViewActions(e);
        });

        // sound editor script
        const audioContainer = $($(".audio-controller-container")[0]);
        $(".audio-controller-toggle-btn").on("click", () => {
            audioContainer.toggleClass("visible");
            updateAudioUploader();
        });
        audioContainer.on("click", function(e) {
            if ($(e.target).hasClass("audio-item")) {
                const changeSoundKey = $(e.target).text();
                console.log(changeSoundKey);
            }

            if ($(e.target).hasClass("update-audio-btn")) {
                const audioItem = $($(e.target).closest(".audio-item"));
                const soundKey = audioItem.attr("data-key");
                const audio = $("input[type='file']", audioItem)[0].files[0];

                const fileReader = new FileReader();
                fileReader.addEventListener("load", () => {
                    const audioData = fileReader.result;

                    HowlerSoundManager.replaceSound(soundKey, audioData, $("input[type='number']", audioItem)[0].value);
                });
                fileReader.readAsDataURL(audio);
            }
        });
        $("body").on("dragover", function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        $("body").on("dragenter", function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
        $("body").on("drop", function(e) {
            if (e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files.length) {
                e.preventDefault();
                e.stopPropagation();
                /*UPLOAD FILES HERE*/

                const files = e.originalEvent.dataTransfer.files;
                for (let i = 0; i < files.length; i++) {
                    if (files[i].type.indexOf("audio") >= 0) {
                        const audio = files[i];
                        const soundKey = files[i].name.slice(0, files[i].name.length - 4);

                        const fileReader = new FileReader();
                        fileReader.addEventListener("load", () => {
                            const audioData = fileReader.result;

                            HowlerSoundManager.replaceSound(soundKey, audioData);
                        });
                        fileReader.readAsDataURL(audio);
                    }
                }

                updateAudioUploader();
            }
        });

        $("#insufficientBalanceCloseBtn").on("click", () => {
            UI.showInsufficientBalance(false);
        });
    }

    function validateBetInputButtonsOnFirstLoad() {
        const inputAmounts = $(".bet-wrapper .input-amount");
        for (let i = 0; i < inputAmounts.length; i++) {
            validateBetInputButtonsView($(inputAmounts[i]));
        }
    }

    function validateBetInputButtonsView(inputAmount, min = null, max = null) {
        setTimeout(() => {
            const input = $("input", inputAmount);
            const limits = UGG.getBetLimits();
            const minbet = min != null ? min : limits.MinBet;
            const maxbet = max != null ? max : limits.MaxBet;

            if (parseFloat(input.val()) <= minbet) {
                $(".input-btn.minus", inputAmount).addClass("edge");
                $(".input-btn.plus", inputAmount).removeClass("edge");
            } else if (parseFloat(input.val()) >= maxbet) {
                $(".input-btn.minus", inputAmount).removeClass("edge");
                $(".input-btn.plus", inputAmount).addClass("edge");
            } else {
                $(".input-btn.minus", inputAmount).removeClass("edge");
                $(".input-btn.plus", inputAmount).removeClass("edge");
            }
        }, 0);
    }

    function updateAudioUploader() {
        const howlerAudios = HowlerSoundManager.sounds;

        const audioContainer = $($(".audio-controller-container")[0]);
        if (audioContainer.hasClass("visible")) {
            audioContainer.html("");

            for (let key in howlerAudios) {
                audioContainer.append(`
          <div class="audio-item" data-key="${howlerAudios[key].key}">
            <div class="volume-input">
              <span>
                ♬ ${howlerAudios[key].key}
              </span>
              <input type="number" data-key="${howlerAudios[key].key}" value="${howlerAudios[key].volume}"></input>
              <span class="input-placeholder">volume [0-1]</span>
            </div>
            <input type="file" data-key="${howlerAudios[key].key}" label></input>
            <div class="update-audio-btn">update</div>
          </div>
        `);
            }
        }
    }

    // mobile input view scripts
    let mobileInputActions = [];
    const $mobileInputWrapper = $("#mobileInputWrapper");
    const $mobileInputValue = $("#mobileInputValue");
    const $mobileInputValueSufix = $("#mobileInputValueSufix");

    function showMobileInputView(e, limits, isBetInput = false) {
        if (!(isMobile() || isTablet())) return;
        if ($(e.target).hasClass("input-btn")) return;

        const input = $($("input", $(e.currentTarget))[0]);
        if ($("input", $(e.currentTarget))[0].type != "number") return;

        $mobileInputWrapper.addClass("visible");
        $(".input-area", $mobileInputWrapper).removeClass("invalid");
        $mobileInputValue.text(input.val());
        $mobileInputValueSufix.text(getMobileInputValueSufix(input.val()));

        if (isBetInput) {
            $("#mobileInputCurrency").show().text(UGG.getActiveWallet().CurrencyCode);
            $(".fixed-amount-container", $mobileInputWrapper).show();
        } else {
            $("#mobileInputCurrency").hide();
            $(".fixed-amount-container", $mobileInputWrapper).hide();
        }

        mobileInputActions = [{
            inputRef: input,
            isBetInput: isBetInput,
            limits: limits,
            action: "",
            amount: "",
            currentAmount: input.val(),
            lastValue: input.val(),
        }, ];
    }

    function hideMobileInputView() {
        $mobileInputWrapper.removeClass("visible");
    }

    function mobileInputViewActions(e) {
        const action = $(e.currentTarget);
        const limits = mobileInputActions[0].limits;
        let currentAmount = $mobileInputValue.text();

        switch (action.attr("action")) {
            case "f1":
                if (mobileInputActions[mobileInputActions.length - 1].action == "f1") return;

                currentAmount = action.attr("amount");
                break;
            case "f2":
                if (mobileInputActions[mobileInputActions.length - 1].action == "f2") return;

                currentAmount = action.attr("amount");
                break;
            case "f3":
                if (mobileInputActions[mobileInputActions.length - 1].action == "f3") return;

                currentAmount = action.attr("amount");
                break;
            case "f4":
                if (mobileInputActions[mobileInputActions.length - 1].action == "f4") return;

                currentAmount = Math.min(UGG.getActiveWallet().Amount, UGG.getBetLimits().MaxBet).toFixed(2);
                break;

            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
            case "7":
            case "8":
            case "9":
            case "0":
                currentAmount = mobileInputNumberActionResult(
                    action.attr("action"),
                    mobileInputActions.length == 1 ?
                    "0" :
                    mobileInputActions[mobileInputActions.length - 1].action == "f1" ||
                    mobileInputActions[mobileInputActions.length - 1].action == "f2" ||
                    mobileInputActions[mobileInputActions.length - 1].action == "f3" ||
                    mobileInputActions[mobileInputActions.length - 1].action == "f4" ?
                    "0" :
                    currentAmount
                );
                break;
            case ".":
                if (currentAmount.indexOf(".") >= 0) return;

                currentAmount = mobileInputNumberActionResult(action.attr("action"), mobileInputActions.length == 1 ? "0" : currentAmount);
                break;

            case "undo":
                if (mobileInputActions[mobileInputActions.length - 1].action == "") return;

                $mobileInputValue.text(mobileInputActions[mobileInputActions.length - 1].lastValue);
                $mobileInputValueSufix.text(getMobileInputValueSufix(mobileInputActions[mobileInputActions.length - 1].lastValue));
                mobileInputActions.splice(mobileInputActions.length - 1, 1);
                validateMobileInputView(mobileInputActions[mobileInputActions.length - 1].lastValue, limits);
                console.log(mobileInputActions);
                return;
            case "reset":
                $mobileInputValue.text(mobileInputActions[0].lastValue);
                $mobileInputValueSufix.text(getMobileInputValueSufix(mobileInputActions[0].lastValue));
                mobileInputActions.splice(1, mobileInputActions.length - 1);
                validateMobileInputView(mobileInputActions[0].lastValue, limits);
                console.log(mobileInputActions);
                return;
            case "cancel":
                hideMobileInputView();
                return;
            case "done":
                if (!validateMobileInputView(mobileInputActions[mobileInputActions.length - 1].currentAmount, limits)) return;

                hideMobileInputView();
                mobileInputActions[0].inputRef.val(mobileInputActions[mobileInputActions.length - 1].currentAmount).trigger("change");
                break;
        }

        $mobileInputValue.text(currentAmount);
        $mobileInputValueSufix.text(getMobileInputValueSufix(currentAmount));
        mobileInputActions.push({
            action: action.attr("action"),
            amount: action.attr("amount"),
            currentAmount: currentAmount,
            lastValue: mobileInputActions[mobileInputActions.length - 1].currentAmount,
        });
        validateMobileInputView(currentAmount, limits);
    }

    function validateMobileInputView(inputValue, limits) {
        const inputVal = parseFloat(inputValue);
        const $inputArea = $(".input-area", $mobileInputWrapper);
        if (inputVal >= limits.MinBet && inputVal <= limits.MaxBet) {
            const splitedValue = inputValue.split(".");
            if (splitedValue.length > 1 && splitedValue[1].length > 2) {
                $inputArea.addClass("invalid");
                return false;
            } else {
                $inputArea.removeClass("invalid");
                return true;
            }
        } else {
            $inputArea.addClass("invalid");
            return false;
        }
    }

    function getMobileInputValueSufix(inputValue) {
        const splitValue = inputValue.split(".");

        let result = splitValue.length == 1 ? ".00" : splitValue[1].padStart(2, "0").replace(splitValue[1], "");

        return result;
    }

    function mobileInputNumberActionResult(number, currentValue) {
        let result = "";
        if (currentValue == "0") {
            result += number;
        } else {
            if (number == "." && currentValue.indexOf(".") >= 0) return currentValue;

            result = currentValue + number;
        }
        return result;
    }
    // end of mobile input scripts

    // insufficient balance popup
    function showInsufficientBalance(visible) {
        if (visible == true) {
            $("#insufficientBalanceWrapper").addClass("show");
        } else {
            $("#insufficientBalanceWrapper").removeClass("show");
        }
    }
    // end of insufficient balance popup

    function isMobile() {
        return /iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase());
    }

    function isTablet() {
        return /ipad|android|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase());
    }

    function onUIResize() {
        if (isMobile() || isTablet()) {
            $('input[type="number"]').attr("readonly", "readonly");
        } else {
            $('input[type="number"]').removeAttr("readonly");
        }
    }

    function getLocalStorageData(gameName, dataKey) {
        console.warn("getLocalStorageData: ", gameName);
        try {
            if (window.localStorage) {
                return window.localStorage.getItem(`${gameName}-${dataKey}`);
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    function setLocalStorageData(gameName, dataKey, data) {
        console.warn("setLocalStorageData: ", gameName, dataKey, data);
        try {
            if (window.localStorage) {
                window.localStorage.setItem(`${gameName}-${dataKey}`, data);
            }
        } catch (error) {
            console.warn("local storage is not available!");
        }
    }

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min) + min);
    }

    function getRandomIntsInRange(min, max, n) {
        return Array.from({
            length: n
        }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    }

    function getRandomIntsUniqueInRange(min, max, n) {
        if (n > max - min) n = max - min;

        const uniques = [];
        while (uniques.length < n) {
            const randomNumberInRange = getRandomInt(min, max);
            if (uniques.indexOf(randomNumberInRange) === -1) {
                uniques.push(randomNumberInRange);
            }
        }
        return uniques;
    }

    function addCustomTextMessage(message) {
        initCurstomMessageContainerIfNotExists();

        const antine = $("#customMessageContainer");
        antine.prepend($(`<div>time: ${new Date().toUTCString()}, message: ${message}</div>`));

        if ($("div", antine).length > 15) {
            antine.find("div:last").remove();
        }
    }

    function initCurstomMessageContainerIfNotExists() {
        if ($("#customMessageContainer").length == 0) {
            const antine = $(`<div id="customMessageContainer" class="custom-message-container"></div>`);
            $("body").append(antine);

            const messageContainerStyle = $(`
      <style>
        .custom-message-container {
          position: fixed;
          right: 0;
          top: 0;
          z-index: 99999999999999;
          display: flex;
          flex-direction: column;
          font-size: 16px;
          background-color: rgba(0, 0, 0, 0.8);
          pointer-events: none;
          opacity: 0.7;
        }
        .custom-message-container div {
          color: #cccccc;
          opacity: 0.8;
          padding: 5px;
        }
        .custom-message-container div:first-child {
          color: yellow;
          opacity: 1;
        }
      </style>
      `);

            $("head").append(messageContainerStyle);
        }
    }

    return {
        init: init,

        drawCurrentBets: drawCurrentBets,
        drawMyBets: drawMyBets,
        drawMyNewBet: drawMyNewBet,
        redrawMyBet: redrawMyBet,
        drawHighrollerBets: drawHighrollerBets,

        drawChatHistory: drawChatHistory,

        addHiddenAmount: addHiddenAmount,

        lockWallets: lockWallets,
        unlockWallets: unlockWallets,

        currencySymbol: CurrencySymbol,

        handleRaceCountDownInit: handleRaceCountDownInit,
        drawError: drawError,

        showMobileInputView: showMobileInputView,
        showInsufficientBalance: showInsufficientBalance,

        getLocalStorageData: getLocalStorageData,
        setLocalStorageData: setLocalStorageData,
        getRandomInt: getRandomInt,
        getRandomIntsInRange: getRandomIntsInRange,
        getRandomIntsUniqueInRange: getRandomIntsUniqueInRange,
        isMobile: isMobile,

        addCustomTextMessage: addCustomTextMessage,

        mainLoader: mainLoader,
    };
})();

// $(document).ready(function () {
//   // restrict onyxion.games to show upgaming logos and favicons
//   if (window.location.href.indexOf("onyxion.games") < 0) {
//     $(".upgaming").show();

//     $("#main-loader img").show();

//     const appleLink = document.createElement("link");
//     appleLink.rel = "apple-touch-icon";
//     appleLink.sizes = "180x180";
//     document.getElementsByTagName("head")[0].appendChild(appleLink);
//     appleLink.href = "static/images/favicon/apple-touch-icon.png";

//     const icon32 = document.createElement("link");
//     icon32.rel = "icon";
//     icon32.sizes = "32x32";
//     document.getElementsByTagName("head")[0].appendChild(icon32);
//     icon32.href = "static/images/favicon/favicon-32x32.png";

//     const icon16 = document.createElement("link");
//     icon16.rel = "icon";
//     icon16.sizes = "180x180";
//     document.getElementsByTagName("head")[0].appendChild(icon16);
//     icon16.href = "static/images/favicon/apple-touch-icon.png";

//     const manifestLink = document.createElement("link");
//     icon16.rel = "manifest";
//     document.getElementsByTagName("head")[0].appendChild(manifestLink);
//     manifestLink.href = "static/images/favicon/site.webmanifest";
//   } else {
//     $(".header-wrapper").addClass("onyxion");
//   }
// });

export default UI;

if (!(window.location.hostname == "localhost" || window.location.hostname.indexOf("upgaming.dev") >= 0)) {
    console.log = () => {};
    console.warn = () => {};
    console.table = () => {};
}
import {
    extend
} from "jquery";
import UGG from "./server";

window.PG = (function() {
    const _options = {
        AutoBet: {
            onWin: false,
            onLoss: false,
            stopAuto: false,
        },
    };

    const SwitchAutoBet = (manual) => {
        var chosenTab = manual ? "manual" : "auto";

        $(`.left-content section.${chosenTab}-section`)
            .siblings("section")
            .fadeOut(100, function() {
                $(`.left-content section.${chosenTab}-section`).fadeIn(100);
            });

        $(`.tab-switcher .tab.${chosenTab}`).addClass("active");
        $(`.tab-switcher .tab.${chosenTab}`).siblings(".tab").removeClass("active");
    };

    const InitDom = (gameName) => {
        // console.warn('get sound state from local storage: ', getSoundStateFromLocalStorage(gameName), gameName);
        const soundStateFromLocalStorage = getSoundStateFromLocalStorage(gameName);
        if (soundStateFromLocalStorage == null) {
            // show popup
        } else {
            if (soundStateFromLocalStorage == "true") {
                // check if can play sound
                $("#soundPopup").hide();
                // AudioManager.Mute(false);
                updateVolumeIndicator();

                // setTimeout(() => {
                //   AudioManager.Mute(false);
                //   updateVolumeIndicator();
                //   $("#soundPopup").hide();

                //   AudioManager.PlayBlankSound("blank", () => {
                //     // console.warn('cant play blank sound! ');
                //     $("#soundPopup").show();
                //   });
                // }, 0);
            } else {
                // show popup
            }
        }
        updateVolumeIndicator();
    };
    void(function InitDomEvents() {
        //multiply
        $(".left-content .multiplier.double-bet").on("click", function() {
            var input = $(this).parent(".input-wrapper").find("input");
            var amount = input.val();
            if (!amount || input.attr("disabled")) return;
            $(input).val(amount * 2);
            EventEmitter.emit("CalcProfit");
        });
        $(".left-content .multiplier.half-bet").on("click", function() {
            var input = $(this).parent(".input-wrapper").find("input");
            var amount = input.val();
            if (!amount || input.attr("disabled")) return;
            $(input).val(amount / 2);
            EventEmitter.emit("CalcProfit");
        });

        //prevent submit on enter
        $(".left-content").keydown(function(event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                return false;
            }
        });

        $(".chat-header").on("click", function() {
            var $this = $(this);
            var $exp = $this.find(".exp-col");
            var $rc = $this.closest(".right-content");

            if ($rc.hasClass("open-chat")) {
                $exp.removeClass("expanded");
                $rc.removeClass("open-chat");
            } else {
                $exp.addClass("expanded");
                $rc.addClass("open-chat");
            }
        });

        //manual/auto tab switch
        $(".left-content .tab").on("click", function() {
            var manualTab = true;

            if ($(this).hasClass("manual")) manualTab = true;
            else if ($(this).hasClass("auto")) manualTab = false;

            PG.SwitchAutoBet(manualTab);
        });

        //on win/loss increase bet
        $(".on-win .incr-by").on("click", function() {
            // AudioManager.Play("btn");
            $(this).parent(".on-win").addClass("active");
            $(this).siblings("input").focus();
            _options.AutoBet.onWin = true;
        });
        $(".on-loss .incr-by").on("click", function() {
            // AudioManager.Play("btn");
            $(this).parent(".on-loss").addClass("active");
            $(this).siblings("input").focus();
            _options.AutoBet.onLoss = true;
        });
        $(".on-win .reset").on("click", function() {
            // AudioManager.Play("btn");
            $(this).parent(".on-win").removeClass("active");
            _options.AutoBet.onWin = false;
        });
        $(".on-loss .reset").on("click", function() {
            // AudioManager.Play("btn");
            $(this).parent(".on-loss").removeClass("active");
            _options.AutoBet.onLoss = false;
        });

        //my bets tab switch
        $(".my-bets-header .tab").on("click", function() {
            $(".my-bets-header .tab").removeClass("active");
            $(this).addClass("active");
            var body = $(this).data("body");
            const state = UGG.getGameState();
            if (state.gameName !== "dino") {
                $(".tab-body").hide();
            }
            $("." + body).show();
        });

        // rightbar tab switches

        $(".rightbar .my-bet").on("click", () => {
            const myBet = $(".my-bets")[1];
            $(".my-bets-header .tab").removeClass("active");
            $(myBet).addClass("active");
            var body = $(myBet).data("body");
            const state = UGG.getGameState();
            if (state.GameName !== "dino") {
                $(".tab-body").hide();
            }
            $("." + body).show();
            $(".rightbar").addClass("hidden");
            $("main .right-section .section-body").addClass("active");
        });

        $(".rightbar .highrollers").on("click", () => {
            const myBet = $(".highroller-bets")[0];
            $(".my-bets-header .tab").removeClass("active");
            $(myBet).addClass("active");
            var body = $(myBet).data("body");
            const state = UGG.getGameState();
            if (state.GameName !== "dino") {
                $(".tab-body").hide();
            }
            $("." + body).show();
            $(".rightbar").addClass("hidden");
            $("main .right-section .section-body").addClass("active");
        });

        $(".rightbar .current-bet").on("click", () => {
            const myBet = $(".current-bets")[0];
            $(".my-bets-header .tab").removeClass("active");
            $(myBet).addClass("active");
            var body = $(myBet).data("body");
            $(".tab-body").hide();
            $("." + body).show();
            $(".rightbar").addClass("hidden");
            $("main .right-section .section-body").addClass("active");
        });

        $(".rightbar .game-rules").on("click", () => {
            $("#popup-rules").find(".popup-body").html(TRANS.byGameKey("rules_desc")).end().fadeIn("fast");
            $(".rightbar").addClass("hidden");
        });

        // section body close event

        $("main .right-section .section-body .close").on("click", () => {
            $("main .right-section .section-body").removeClass("active");
        });

        //bet history tab switch
        $(".history-tabs li").on("click", function() {
            $(this).addClass("active");
            $(this).siblings().removeClass("active");

            if ($(this).hasClass("bets-tab-option")) {
                $(".bets-tab")
                    .siblings()
                    .fadeOut(100, function() {
                        $(".bets-tab").fadeIn(100);
                    });
            } else if ($(this).hasClass("highrollers-tab-option")) {
                $(".highrollers-tab")
                    .siblings()
                    .fadeOut(100, function() {
                        $(".highrollers-tab").fadeIn(100);
                    });
            }
        });

        $(".overlay.err-popup .btn").on("click", function() {
            $(".overlay.err-popup").removeClass("visible");
        });

        //sounds
        // $(".volume").on("click", function () {
        //   $(".volume").toggleClass("muted");
        //   AudioManager.ToggleMute();
        //   setSoundStateToLocalStorage(UGG.getGameState().GameName, !AudioManager.Muted);

        //   if (AudioManager.Muted) {
        //     AudioManager.StopAll();
        //   }
        // });
        // $("#soundOn").on("click", function () {
        //   AudioManager.Mute(false);
        //   updateVolumeIndicator();
        //   setSoundStateToLocalStorage(UGG.getGameState().GameName, !AudioManager.Muted);

        //   AudioManager.Play("blank", false);

        //   $("#soundPopup").hide();
        // });
        // $("#soundOff").on("click", function () {
        //   AudioManager.Mute(true);
        //   updateVolumeIndicator();
        //   setSoundStateToLocalStorage(UGG.getGameState().GameName, !AudioManager.Muted);

        //   $("#soundPopup").hide();

        //   // if some sound playing before popup
        //   AudioManager.StopAll();
        // });

        $("i.live-chat-icon").on("click", function() {
            $(this).hide();
            $("section.live-chat").slideDown(200);
        });

        $("section.live-chat .minimize").on("click", function() {
            $("i.live-chat-icon").show();
            $("section.live-chat").hide();
        });

        $(".menu-burger").on("click", () => {
            const rightbar = $(".rightbar");
            rightbar.hasClass("hidden") ? rightbar.removeClass("hidden") : rightbar.addClass("hidden");
        });

        $(".rightbar .close").on("click", () => {
            $(".rightbar").addClass("hidden");
        });

        initSoundEvents();
    })();

    function updateVolumeIndicator() {
        // if (AudioManager.Muted) $(".volume").addClass("muted");
        // else $(".volume").removeClass("muted");
    }

    function getSoundStateFromLocalStorage(gameName) {
        // console.warn('getSoundStateFromLocalStorage: ', gameName);
        try {
            if (window.localStorage) {
                return window.localStorage.getItem(`${gameName}-sound`);
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
    // function setSoundStateToLocalStorage(gameName, mute) {
    //   // console.warn('setSoundStateToLocalStorage: ', gameName, mute);
    //   try {
    //     if (window.localStorage) {
    //       window.localStorage.setItem(`${gameName}-sound`, mute);
    //     }
    //   } catch (error) {
    //     console.warn("local storage is not available!");
    //   }
    // }
    function initSoundEvents() {
        $(".input-btn.minus").on("click", () => {
            // HowlerSoundManager.play("bet-minus");
        });
        $(".input-btn.plus").on("click", () => {
            // HowlerSoundManager.play("bet-plus");
        });
        $(".checkbox-wrapper label").on("click", (e) => {
            // AudioManager.Play("autoplay", false, false);
            //   console.log(
            //     "checkbox checked state: ",
            //     $("input", $(e.currentTarget)).is(":checked")
            //   );
            //   if ($("input", $(e.currentTarget)).is(":checked") == true) {
            //     AudioManager.Play("make-bet", false, false);
            //   } else {
            //     AudioManager.Play("cancel-bet", false, false);
            //   }
        });
        $(".bet-button").on("click", () => {
            $(".bet-button").blur();
            // AudioManager.Play("make-bet", false, false);
        });
        $(".cashout-button").on("click", () => {
            // AudioManager.Play("money-pickup", false, false);
        });
        $(".bet-fixed-amount-wrapper").on("click", () => {
            // AudioManager.Play("button-click", false, false);
        });
        $(".next-round-bet").on("click", () => {
            // AudioManager.Play("make-bet", false, false);
        });
        $(".cancel-next-round-bet").on("click", () => {
            // AudioManager.Play("cancel-bet", false, false);
        });
        $(".chat-header").on("click", function() {
            // AudioManager.Play("button-click", false, false);
        });
        $(".my-bets-header .tab").on("click", () => {
            // AudioManager.Play("button-click", false, false);
        });
        $(".wallet-wrapper").on("click", () => {
            // AudioManager.Play("button-click", false, false);
        });
    }

    return {
        InitDom: InitDom,
        SwitchAutoBet: SwitchAutoBet,
        getOptions: () => _options,
    };
})();

window.GetFloatString = function(amount, decimalPlaces = 2, separateWithCommas = true) {
    return GetNumStr(parseFloat(amount.toFixed(10)), decimalPlaces, separateWithCommas);
};
window.GetNumStr = function(amount, decimalPlaces = 2, separateWithCommas = true) {
    if (amount == null || amount === "" || isNaN(amount)) {
        return "";
    }

    var hn = Math.pow(10, decimalPlaces);
    let m = parseFloat((amount * hn).toFixed(decimalPlaces * 2));
    amount = Math.floor(m) / hn;
    // amount = Math.floor(amount * hn) / hn;
    amount = amount.toFixed(decimalPlaces);

    return amount;

    if (!separateWithCommas) return amount;

    var [n1, n2] = amount.split(".");
    for (let i = n1.length - 3; i > 0; i -= 3) {
        n1 = n1.slice(0, i) + "," + n1.slice(i);
    }

    return n1 + (!decimalPlaces ? "" : "." + n2);
};
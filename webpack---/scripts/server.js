import {
    SoundObject
} from "./soundManager";

window.UGG = (function() {
    let _user;
    let _chatID = null;
    let _wallets;
    let _activeWalletID;
    let _gameState;
    let _spinState;
    let _mqttClient;
    let _options = {
        BuildID: __BUILD_ID__,
        BASE_DOMAIN: __DOMAIN__,
        MqttEndpoint: __MQTT__,
        ApiEndpoint: __API__,
        StaticApiEndpoint: __STATIC_API__,

        SingleBet: true,
        Lang: "EN",
        HasSettings: false,
        HasChat: true,
        HasHighRollers: true,
        DrawMyNewBet: true,
    };

    if (_options.BASE_DOMAIN == "default") _options.BASE_DOMAIN = window.location.hostname;
    _options.ApiEndpoint = "https://" + _options.BASE_DOMAIN + _options.ApiEndpoint;

    let _currentBets = [];
    let _myBets = [];

    const _mqttMap = {};
    const _gameEvents = {};

    const queryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i) {
            var p = a[i].split("=", 2);
            if (p.length == 1) b[p[0].toLowerCase()] = "";
            else b[p[0].toLowerCase()] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split("&"));

    const formatRequestArgs = (args) => {
        args.ParamsJson = JSON.stringify(args.Params || {});
        delete args["Params"];

        return args;
    };

    const activeWallet = () => {
        return _wallets.find((q) => q.UniqueID == _activeWalletID);
    };

    const setGameState = (data, merge) => {
        for (var i = 0; i < data.Bets.length; i++) {
            data.Bets[i].Params = JSON.parse(data.Bets[i].ParamsJson);
            data.Bets[i].CurrentState = JSON.parse(data.Bets[i].CurrentStateJson);

            delete data.Bets[i].ParamsJson;
            delete data.Bets[i].CurrentStateJson;
        }

        const oldState = _gameState;
        let freebets = data.FreeBets;

        if (merge && oldState) {
            const bet = data.Bets[0];
            const bets = oldState.Bets.filter((q) => q.SpinID == bet.SpinID && bet.SpinID != null && q.GUID != bet.GUID);

            data.Bets = data.Bets.concat(bets);
        }

        data.Bet = null;

        if (_options.SingleBet && data.Bets.length > 0) {
            data.Bet = data.Bets[0];
        }

        if (_gameState) data.OldBet = _gameState.Bet;

        _gameState = data;
        _gameState.FreeBets = null;

        if (_gameState.CurrentBets) _currentBets = _gameState.CurrentBets;

        checkMyCurrentBets();

        if (_gameState.MyBets) {
            _myBets = _gameState.MyBets;
            UI.drawMyBets(_myBets);
        }

        if (_gameState.LiveTableID) {
            subscribeLiveTable();
        } else {
            subscribeChannel();
        }

        if (freebets) {
            _wallets = _wallets.filter((x) => !x.FreeBet);

            freebets.forEach((freeBet) => {
                const totalAmountDecimal = new Decimal(freeBet.TotalAmount);
                const spentAmountDecimal = new Decimal(freeBet.SpentAmount);
                // const walletAmount = freeBet.TotalAmount - freeBet.SpentAmount;
                const walletAmount = totalAmountDecimal.minus(spentAmountDecimal);

                let wallet = {
                    CurrencyCode: freeBet.CurrencyCode,
                    Amount: walletAmount.toNumber(),
                    FreeBet: freeBet,
                };
                _wallets.push(wallet);
                setWalletUniqueID(wallet);
            });

            _wallets.sort(function(a, b) {
                if (!a.FreeBet != !b.FreeBet) return !a.FreeBet ? 1 : -1;

                if (a.FreeBet) return a.FreeBet.ID - b.FreeBet.ID;

                return b.Amount / b.USDRate - a.Amount / a.USDRate;
            });

            trigger("user.wallets", _wallets);
        }

        trigger("game.state.set", _gameState);
    };

    const setSpinState = (spinState) => {
        let spinchanged = !_spinState || _spinState.sp != spinState.sp;

        _spinState = spinState;

        if (spinchanged) {
            sortCurrentBets();
            checkMyCurrentBets();
        }

        trigger("game.spin.set", _spinState);
    };

    const checkMyCurrentBets = () => {
        if (_gameState.LiveTableID) {
            if (!_spinState) return;

            _gameState.Bets = _gameState.Bets.filter((x) => !x.Finished && x.SpinID == _spinState.sp);
        } else {
            _gameState.Bets = _gameState.Bets.filter((x) => !x.Finished);
        }

        if (!_gameState.Bets.length) {
            UI.unlockWallets();
        }
    };

    const sortCurrentBets = () => {
        if (!_spinState) return;

        _currentBets = _currentBets.filter((q) => q.SpinID == _spinState.sp);

        //console.log('before', JSON.parse( JSON.stringify(_currentBets)) );
        _currentBets.sort((a, b) => {
            let a_isOur = a.UserGUID == _user.GUID;
            let b_isOur = b.UserGUID == _user.GUID;

            if (a_isOur != b_isOur) return a_isOur > b_isOur ? -1 : 1;

            if (_spinState.n == null && a.Finished != b.Finished) return a.Finished > b.Finished ? 1 : -1;

            return b.BetAmount / b.USDRate - a.BetAmount / a.USDRate;
        });
        //console.log('after',JSON.parse( JSON.stringify(_currentBets)) );

        trigger("msg.bets.current", _currentBets);
    };

    const updateCurrentBets = (bet) => {
        _currentBets = _currentBets.filter((q) => q.GUID != bet.GUID);

        if (!bet.Cancelled) _currentBets.push(bet);

        sortCurrentBets();

        if (bet.UserGUID == _user.GUID && bet.Finished && !bet.Cancelled) {
            if (_options.DrawMyNewBet) {
                UI.drawMyNewBet(bet);
            } else {
                console.log("skip.bet.draw", bet);
            }
        }
    };

    const apiCallAsync = async (method, data) => {
        return new Promise((resolve, reject) => {
            $.post({
                    url: _options.ApiEndpoint + method,
                    contentType: "application/json",
                    dataType: "json",
                    data: JSON.stringify(data),
                },
                (res) => {
                    if (res.Error && res.Error == true) {
                        console.error("Something Went Wrong! ", method, res);
                        reject(res.ErrorResponse.Errors);
                    } else {
                        resolve(res);
                    }
                },
                "json"
            ).fail((res) => {
                let err = res.responseJSON;
                if (err && err.ErrorResponse && err.ErrorResponse.Errors) reject(err.ErrorResponse.Errors);
                else reject(res);
            });
        });
    };

    const staticApiCallAsync = async (method, args) => {
        return new Promise((resolve, reject) => {
            $.ajax({
                    method: "GET",
                    url: _options.StaticApiEndpoint + method,
                    dataType: "json",
                    data: args,
                })
                .done((res) => {
                    if (res.Error && res.Error == true) {
                        console.error("Something Went Wrong! ", method, res);
                        reject(res.ErrorResponse.Errors);
                    } else {
                        resolve(res);
                    }
                })
                .fail((res) => {
                    let err = res.responseJSON;
                    if (err && err.ErrorResponse && err.ErrorResponse.Errors) reject(err.ErrorResponse.Errors);
                    else reject(res);
                });
        });
    };

    const authAsync = async () => {
        return new Promise((resolve, reject) => {
            apiCallAsync("account/login", {
                    Integration: _options.Integration,
                    CompanyName: _options.CompanyName,
                    ExternalToken: _options.Token,
                    Domain: _options.Domain,
                    Game: _options.GameName.toLowerCase(),
                    DeviceGUID: machineUniqueGUID(),
                    IsMobile: window.UI ? .isMobile(),
                    SecString: _options.SecString,
                })
                .then((res) => {
                    if (res.Error == true) {
                        $("#main-loader").html("Game is not available");
                        reject();
                    } else {
                        resolve(res.Data);
                    }
                })
                .catch((err) => {
                    $("#main-loader").html("Game is not available");
                    reject(err);
                });
        });
    };

    const initChatAsync = async () => {
        if (_chatID) return;

        _chatID = _gameState.GameName + "-" + _gameState.ChannelName;

        if (_gameState.LiveTableID) _chatID += "-LT" + _gameState.LiveTableID;

        return new Promise((resolve, reject) => {
            apiCallAsync("chat/history", {
                    ChatID: _chatID,
                    SessionToken: _user.SessionGUID,
                })
                .then((res) => {
                    mqttMap(`ugg/chat/${_chatID}`, "chat.message");

                    resolve(res.Data);
                })
                .catch(reject);
        });
    };

    const sendMessageAsync = async (message) => {
        return new Promise((resolve, reject) => {
            apiCallAsync("chat/sendMassage", {
                    ChatID: _chatID,
                    Message: message,
                    SessionToken: _user.SessionGUID,
                })
                .then((res) => {
                    resolve(res.Data);
                })
                .catch(reject);
        });
    };

    const refreshGameStateAsync = async (args) => {
        UI.lockWallets();

        return new Promise((resolve, reject) => {
            apiCallAsync("games/state", args)
                .then((res) => {
                    if (!res.error) {
                        resolve(res.Data);
                        setGameState(res.Data, false);
                    } else {
                        reject(res);
                    }
                })
                .catch((err) => {
                    if (err.DBError) {
                        switch (err.DBError) {
                            case "game_unavailable_in_country":
                                trigger("game.unavailable_by_country.set", err);
                                break;
                            default:
                                console.log(err);
                                break;
                        }
                    }
                    reject(err);
                });
        });
    };

    const setWalletsAsync = (wallets) => {
        _wallets = wallets || wallets;

        _wallets.forEach((q) => setWalletUniqueID(q));

        return activateNextWalletAsync();
    };

    const setWalletUniqueID = (wallet) =>
        (wallet.UniqueID = `${wallet.CurrencyCode}.${wallet.BonusGUID || null}.${(wallet.FreeBet && wallet.FreeBet.ID) || null}`);

    const activateNextWalletAsync = () => {
        let def = _wallets.find((q) => q.IsDefault);
        let walletID = null;

        if (def) walletID = def.UniqueID;
        else walletID = _wallets[0].UniqueID;

        return setActiveWalletAsync(walletID);
    };

    const setActiveWalletAsync = (walletID) => {
        if (!walletID) return;
        if (!_wallets.find((q) => q.UniqueID == walletID)) activateNextWalletAsync();
        else _activeWalletID = walletID;

        trigger("user.wallets", _wallets);

        return new Promise((resolve, reject) => {
            refreshGameStateAsync({
                GameName: _options.GameName,
                SessionToken: _user.SessionGUID,
                LiveTableID: _options.LiveTableID,
                CurrencyCode: activeWallet().CurrencyCode,
            }).then((state) => {
                if (_options.HasChat) {
                    initChatAsync()
                        .then((messages) => {
                            UI.drawChatHistory(messages);
                        })
                        .catch(UI.drawError);
                }

                if (_options.HasSettings) {
                    getGameSettings().then((settings) => {
                        trigger("game.settings", settings);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    };

    const updateUserWallet = async (args) => {
        args = $.extend(args, {
            SessionToken: _user.SessionGUID,
            CompanyName: _options.CompanyName,
        });

        return new Promise((resolve, reject) => {
            apiCallAsync("account/balance", args)
                .then((res) => {
                    if (!res.error) {
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    const refreshGameRaces = async (args) => {
        args = $.extend(args, {
            SessionToken: _user.SessionGUID,
            CompanyName: _options.CompanyName,
        });

        return new Promise((resolve, reject) => {
            apiCallAsync("games/races", args)
                .then((res) => {
                    if (!res.error) {
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    const refreshGameRacePoints = async (args) => {
        args = $.extend(args, {
            SessionToken: _user.SessionGUID,
            CompanyName: _options.CompanyName,
        });

        return new Promise((resolve, reject) => {
            apiCallAsync("games/racePoints", args)
                .then((res) => {
                    if (!res.error) {
                        trigger("game.racepoint.set", res.Data);
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    const getUserBetHistory = async (args) => {
        args = $.extend(args, {
            SessionToken: _user.SessionGUID,
            CompanyName: _options.CompanyName,
            LiveTableID: _gameState.LiveTableID,
            GameName: _gameState.GameName,
        });

        //GUID, StartTime, FinishTime, BetAmount, WinAmiunt, Status, ParamsJson.ac(AutoCashout), CurrentStateJson.c(Cashout), SpinInfo.fn(FinalNumber)

        return new Promise((resolve, reject) => {
            apiCallAsync("games/userBetHistory", args)
                .then((res) => {
                    if (!res.error) {
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    // const getBetHistory = async (args) => {
    //   args = $.extend(args, {
    //     SessionToken: _user.SessionGUID,
    //     CompanyName: _options.CompanyName,
    //     LiveTableID: _gameState.LiveTableID,
    //     GameName: _gameState.GameName,
    //   });

    //   return new Promise((resolve, reject) => {
    //     apiCallAsync("games/GetBetHistory", args)
    //       .then((res) => {
    //         if (!res.error) {
    //           resolve(res.Data);
    //         } else {
    //           reject(res);
    //         }
    //       })
    //       .catch(reject);
    //   });
    // };

    const getBetLimits = () => {
        if (!_gameState) {
            return {
                MinBet: 1,
                MaxBet: 1,
                MaxProfit: 1,
                CurrencyCode: "",
            };
        }

        let minBet = _gameState.MinBet;
        let maxBet = _gameState.MaxBet;
        let maxProfit = _gameState.MaxProfit;
        let currencyCode = _gameState.DefaultCurrencyCode;

        let wallet = activeWallet();

        if (wallet.FreeBet) {
            if (wallet.FreeBet.MinBetAmount && wallet.FreeBet.MinBetAmount > minBet) minBet = wallet.FreeBet.MinBetAmount;

            if (wallet.FreeBet.MaxBetAmount && wallet.FreeBet.MaxBetAmount < maxBet) maxBet = wallet.FreeBet.MaxBetAmount;
        }

        return {
            MinBet: minBet,
            MaxBet: maxBet,
            MaxProfit: maxProfit,
            CurrencyCode: currencyCode,
        };
    };

    const getStepAmount = (currentValue, isIncrement) => {
        const limits = getBetLimits();
        let amount = limits.MinBet;

        const mover = currentValue > 1 ? 100 : 10;
        const roundAmount = ((currentValue * 100) % mover) / 100;

        if (isIncrement) {
            if (currentValue >= 1 && currentValue < 10) {
                amount = 1;
            } else if (currentValue >= 10 && currentValue < 30) {
                amount = 5;
            } else if (currentValue >= 30 && currentValue < 100) {
                amount = 10;
            } else if (currentValue >= 100 && currentValue < 300) {
                amount = 50;
            } else if (currentValue >= 300) {
                amount = 100;
            }

            amount -= roundAmount;

            if (currentValue + amount > limits.MaxBet) amount = limits.MaxBet - currentValue;
        } else {
            if (currentValue <= limits.MaxBet && currentValue > 300) {
                amount = 100;
            } else if (currentValue <= 300 && currentValue > 100) {
                amount = 50;
            } else if (currentValue <= 100 && currentValue > 30) {
                amount = 10;
            } else if (currentValue <= 30 && currentValue > 10) {
                amount = 5;
            } else if (currentValue <= 10 && currentValue > 1) {
                amount = 1;
            }

            if (currentValue - amount < limits.MinBet) amount = limits.MinBet;

            amount += roundAmount;
        }

        return amount;
    };

    const getGameSettings = async (args) => {
        args = $.extend(args, {
            GameName: _options.GameName,
            LiveTableID: _gameState.LiveTableID,
            CurrencyCode: activeWallet().CurrencyCode,
            SessionToken: _user.SessionGUID,
        });

        return new Promise((resolve, reject) => {
            apiCallAsync("games/settings", args)
                .then((res) => {
                    if (!res.error) {
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch((err) => {
                    resolve({
                        CurrencyCode: UGG.getActiveWallet().CurrencyCode,
                        FastBets: [{
                                DisplayName: "5.00",
                                Amount: 5
                            },
                            {
                                DisplayName: "10.00",
                                Amount: 10
                            },
                            {
                                DisplayName: "20.00",
                                Amount: 20
                            },
                            {
                                DisplayName: "All in",
                                Amount: 0
                            },
                        ],
                        GameName: _options.GameName,
                        LiveTableID: null,
                    });
                    // reject(err);
                });
        });
    };

    const createGameBetAsync = async (args) => {
        return new Promise((resolve, reject) => {
            formatRequestArgs(args);

            args = $.extend(args, {
                SessionToken: _user.SessionGUID,
                GameName: _options.GameName,
                LiveTableID: _gameState.LiveTableID,
                ChannelName: _gameState.ChannelName,
                CurrencyCode: activeWallet().CurrencyCode,
                FreeBetID: activeWallet().FreeBet && activeWallet().FreeBet.ID,
            });

            var limit = getBetLimits();

            if (args.BetAmount < limit.MinBet) {
                reject(new Error("min_bet_error"));
                return;
            }

            if (args.BetAmount > limit.MaxBet) {
                reject(new Error("max_bet_error"));
                return;
            }

            UI.lockWallets();
            apiCallAsync("games/bet", args)
                .then((res) => {
                    if (!res.error) {
                        setGameState(res.Data, true);
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    const createGameStepAsync = async (args) => {
        return new Promise((resolve, reject) => {
            formatRequestArgs(args);

            args = $.extend(args, {
                SessionToken: _user.SessionGUID,
                GameName: _options.GameName,
                ChannelName: _gameState.ChannelName,
                LiveTableID: _gameState.LiveTableID,
                CurrencyCode: _gameState.DefaultCurrencyCode,
            });

            apiCallAsync("games/step", args)
                .then((res) => {
                    if (!res.error) {
                        setGameState(res.Data, true);
                        resolve(res.Data);
                    } else {
                        reject(res);
                    }
                })
                .catch(reject);
        });
    };

    const mqttInit = async () => {
        //console.log('mqtt.connect')

        return new Promise((resolve, reject) => {
            _mqttClient = mqtt.connect(_options.MqttEndpoint, {
                username: "public",
                password: "public",
                protocol: "wss",
                hostname: _options.BASE_DOMAIN,
            });

            _mqttClient.on("connect", resolve);
        });
    };

    const mqttMap = (topic, key, callback) => {
        _mqttMap[topic] = key;

        _mqttClient.subscribe(topic, (err) => {
            if (!err) {
                //console.log('mqtt.subscribe', '"' + topic + '"')
            }
        });
    };

    const mqttUnsubscribeOn = (topic) => {
        //console.log('mqttUnsubscribeOn', topic)

        delete _mqttMap[topic];

        _mqttClient.unsubscribe(topic, (err) => {
            //console.log('mqtt.unsubscribe', '"' + topic + '"', err);
        });
    };

    const getRestrictions = async (gameName, companyName) => {
        if (_options.DisplayName == "Rabbit" && _options.GameName == "chicken") {
            Promise.resolve();
            return;
        }

        let waitRestrictions = true;

        let timeout = setTimeout(() => {
            if (waitRestrictions == true) {
                waitRestrictions = false;
                Promise.reject("Restrictions Check Timeout");
            }
        }, 2000);

        return new Promise((resolve, reject) => {
            // $.get(`https://games.upgaming.com/games/api/games/GetRestrictions?game=${gameName}&company=${companyName}`, {}, (res) => {
            $.get(`${_options.ApiEndpoint}games/GetRestrictions?Game=${gameName}&Company=${companyName}`, {}, (res) => {
                if (waitRestrictions == false) {
                    resolve(null);
                } else {
                    waitRestrictions = false;
                    clearTimeout(timeout);
                    resolve(res);
                }
            }).fail(() => {
                reject(null);
            });
        });
    };

    const initAsync = async (options) => {
        let domain = new URL(window.location != window.parent.location ? document.referrer : document.location.href).hostname;

        if (document.location.ancestorOrigins && document.location.ancestorOrigins.length > 0) domain = new URL(document.location.ancestorOrigins[0]).hostname;

        const Integration = queryString.integration;
        const CompanyName = queryString.companyname;
        let Token = queryString.token;

        if (CompanyName.endsWith("_demo") && Integration == "demo") {
            Token = `${CompanyName.substring(0, CompanyName.length - 5)}_${createGUID()}`;
        }

        _options = $.extend(
            _options, {
                LiveTableID: queryString.livetableid,
                Integration: Integration,
                CompanyName: CompanyName,
                Token: Token,
                Lang: queryString.lang || _options.Lang,
                Domain: domain,
                SecString: queryString.SecString,
            },
            options
        );
        // console.log("* * * * * * * ", _options);

        return new Promise((resolve, reject) => {
            // for license must hide upgaming logo
            if (
                queryString.token.toLowerCase().indexOf("license") >= 0 &&
                (window.location.hostname == "localhost" || window.location.hostname.indexOf("upgaming.dev") >= 0)
            ) {
                showUpgaming(false);
                initAsyncPromiseBody(resolve, reject);
                return;
            }

            getRestrictions(_options.GameName, _options.CompanyName)
                .then((ress) => {
                    // console.warn("getRestrictions: res:", ress);
                    // ress.Data.HideGame = false;
                    // ress.Data.HideBanner = false;

                    if (ress) {
                        if (ress.Data.HideGame == true) {
                            const messageText = "This game is not available in your country";
                            if (_options.CompanyName == "advabet") messageText = "Game is not available";

                            $("#main-loader").html(messageText);
                            reject(messageText);
                        } else {
                            showUpgaming(!ress.Data.HideBanner);
                            initAsyncPromiseBody(resolve, reject);
                        }
                    } else {
                        showUpgaming(true);
                        initAsyncPromiseBody(resolve, reject);
                    }
                })
                .catch((err) => {
                    // console.warn("getRestrictions: err:", err);
                    showUpgaming(true);
                    initAsyncPromiseBody(resolve, reject);
                });
        });
    };

    const initAsyncPromiseBody = (resolve, reject) => {
        TRANS.init();

        on("user.wallet.changed", (wallet) => {
            setWalletUniqueID(wallet);
            const wall = _wallets.find((q) => q.UniqueID == wallet.UniqueID);
            if (!wall) return;

            wall.Amount = wallet.Amount;

            trigger("user.wallets", _wallets);
        });

        on("user.freebet.changed", (freebet) => {
            let wallet = {
                CurrencyCode: freebet.CurrencyCode,
                BonusID: null,
                FreeBet: freebet,
            };

            setWalletUniqueID(wallet);

            const wall = _wallets.find((q) => q.UniqueID == wallet.UniqueID);
            if (!wall) return;

            if (freebet.IsValid) {
                wall.FreeBet = freebet;
                wall.Amount = freebet.TotalAmount - freebet.SpentAmount;
            } else {
                let index = _wallets.indexOf(wall);
                _wallets.splice(index, 1);
                if (_activeWalletID == wall.UniqueID) activateNextWalletAsync();
            }

            trigger("user.wallets", _wallets);
        });

        on("user.bets.changed", (userBet) => {
            // console.warn("user.bets.changed", userBet);
            updateCurrentBets(userBet);
        });

        mqttInit().then(() => {
            on("msg.spin", setSpinState);
            on("msg.bets.new", updateCurrentBets);
            on("msg.bets.highrollers", function(highrollerBets) {
                //console.log('msg.bets.highrollers', highrollerBets)
                //updateUserBet(betObj);
                UI.drawHighrollerBets(highrollerBets);
            });

            _mqttClient.on("message", function(topic, message) {
                var msg = JSON.parse(message.toString());
                //console.warn('OnMesssage: ' + topic, msg);

                if (!_mqttMap[topic]) {
                    console.warn("topic: " + topic + " callback not found", msg);
                    return;
                }

                var topicSubcription = _mqttMap[topic];

                trigger(topicSubcription, msg);
            });
        });

        if (!_options.Integration) {
            reject("Integration is required");
            $("body").empty().html(`<div class="frame-error">Integration is required</div>`);
            return;
        }

        if (!_options.GameName) {
            reject("GameName is required");
            $("body").empty().html(`<div class="frame-error">GameName is required</div>`);
            return;
        }

        if (!_options.CompanyName) {
            reject("CompanyName is required");
            $("body").empty().html(`<div class="frame-error">CompanyName is required</div>`);
            return;
        }

        if (!_options.Token) {
            reject("Token is required");
            $("body").empty().html(`<div class="frame-error">Token is required</div>`);
            return;
        }

        _options.Integration = _options.Integration.toLowerCase();
        _options.GameName = _options.GameName.toLowerCase();
        _options.CompanyName = _options.CompanyName.toLowerCase();

        console.table(_options);

        UI.init(_options.GameName, _options.DisplayName);

        HowlerSoundManager.init(
            [
                new SoundObject("blank", "static/sounds/blank.mp3"),
                new SoundObject("btn", "static/sounds/btn.wav"),
                new SoundObject("button-click", "static/sounds/main-btn.wav"),
                new SoundObject("win", "static/sounds/win.wav"),
                new SoundObject("lose", "static/sounds/lose.wav"),
                new SoundObject("bet-minus", "static/sounds/bet-decrease.mp3"),
                new SoundObject("bet-plus", "static/sounds/bet-increase.mp3"),
                new SoundObject("autoplay", "static/sounds/blank.mp3"),
                new SoundObject("money-pickup", "static/sounds/blank.mp3"),
                new SoundObject("make-bet", "static/sounds/blank.mp3"),
                new SoundObject("cancel-bet", "static/sounds/blank.mp3"),
            ],
            _options.GameName
        );

        authAsync()
            .then((user) => {
                _user = user;

                mqttMap(`ugg/usr/${user.GUID}/balance`, "user.wallet.changed");
                mqttMap(`ugg/usr/${user.GUID}/bets`, "user.bets.changed");
                mqttMap(`ugg/usr/${user.GUID}/freebet`, "user.freebet.changed");

                updateUserWallet().then((wallets) => {
                    setWalletsAsync(wallets).then(resolve).catch(reject);

                    trigger("user.wallets", _wallets);
                });
            })
            .catch(reject);
    };

    const StaticContentUrl = (guid, ext) => {
        return _options.StaticApiEndpoint + "content/" + guid + ext;
    };

    const getBannersAsync = async (placeName) => {
        return new Promise((resolve, reject) => {
            staticApiCallAsync("banners/get", {
                    PlaceName: placeName,
                })
                .then((res) => {
                    if (res && res && res.length) {
                        for (var i = 0; i < res.length; i++) {
                            res[i].image = StaticContentUrl(res[i].guid, ".png");
                            delete res[i].guid;
                        }
                        resolve(res);
                    } else {
                        reject("banner not found");
                    }
                })
                .catch(reject);
        });
    };

    const subscribeLiveTable = () => {
        mqttMap(`ugg/rt/${_gameState.RealTableID}/spin`, "msg.spin");
        mqttMap(`ugg/rt/${_gameState.RealTableID}/history`, "msg.history");
        mqttMap(`ugg/lt/${_gameState.LiveTableID}/bets/new`, "msg.bets.new");

        if (_options.HasHighRollers) mqttMap(`ugg/lt/${_gameState.LiveTableID}/bets/highrollers`, "msg.bets.highrollers");
    };

    const subscribeChannel = () => {
        mqttMap(`ugg/ch/${_gameState.ChannelName}/bets/new`, "msg.bets.new");

        if (_options.HasHighRollers) mqttMap(`ugg/ch/${_gameState.ChannelName}/bets/highrollers`, "msg.bets.highrollers");
    };

    const trigger = (eventType, eventData) => {
        //if(eventType != 'game.spin.set' &&
        //   eventType != 'msg.spin')
        //    console.log(eventType, eventData);

        if (eventType in _gameEvents) {
            _gameEvents[eventType].forEach((callback) => {
                if (typeof callback === "function") {
                    callback(eventData);
                }
            });
        } else {
            console.warn("event: " + eventType + " callback not found", eventData);
        }
    };

    const on = (eventType, callback) => {
        eventType = (eventType || "").toLowerCase();

        if (!(eventType in _gameEvents)) {
            _gameEvents[eventType] = [];
        }

        _gameEvents[eventType].push(callback);
    };

    const one = (eventType, callback) => {
        eventType = (eventType || "").toLowerCase();

        _gameEvents[eventType] = [callback];
    };

    const showUpgaming = (show) => {
        if (show) {
            if (window.location.href.indexOf("onyxion.games") >= 0) {
                $(".header-wrapper").addClass("onyxion");
                return;
            }

            $(".upgaming").show();
            $("#main-loader img").show();

            const appleLink = document.createElement("link");
            appleLink.rel = "apple-touch-icon";
            appleLink.sizes = "180x180";
            document.getElementsByTagName("head")[0].appendChild(appleLink);
            appleLink.href = "static/images/favicon/apple-touch-icon.png";

            const icon32 = document.createElement("link");
            icon32.rel = "icon";
            icon32.sizes = "32x32";
            document.getElementsByTagName("head")[0].appendChild(icon32);
            icon32.href = "static/images/favicon/favicon-32x32.png";

            const icon16 = document.createElement("link");
            icon16.rel = "icon";
            icon16.sizes = "180x180";
            document.getElementsByTagName("head")[0].appendChild(icon16);
            icon16.href = "static/images/favicon/apple-touch-icon.png";

            const manifestLink = document.createElement("link");
            icon16.rel = "manifest";
            document.getElementsByTagName("head")[0].appendChild(manifestLink);
            manifestLink.href = "static/images/favicon/site.webmanifest";
        } else {
            $(".header-wrapper").addClass("onyxion");
        }
    };

    const machineUniqueGUID = () => {
        let deviceGUID = UI.getLocalStorageData("device", "guid");

        if (!deviceGUID) {
            deviceGUID = createGUID();
            UI.setLocalStorageData("device", "guid", deviceGUID);
        }

        return deviceGUID;
    };

    const createGUID = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            var r = (Math.random() * 16) | 0,
                v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };

    return {
        on: on,
        one: one,

        queryString: queryString,
        BUILD_ID: _options.BuildID,

        lang: () => _options.Lang,
        gameName: () => _options.GameName,
        companyName: () => _options.CompanyName,

        initAsync: initAsync,
        sendMessageAsync: sendMessageAsync,

        refreshGameStateAsync: async () => {
            refreshGameStateAsync({
                GameName: _options.GameName,
                SessionToken: _user.SessionGUID,
            }).then((state) => {
                console.log("refreshGameStateAsync.state", state);
            });
        },

        createGameBetAsync: createGameBetAsync,
        createGameStepAsync: createGameStepAsync,

        getUser: () => _user,
        getGameState: () => _gameState,
        getSpinState: () => _spinState,
        getWallets: () => _wallets,

        getBetLimits: getBetLimits,
        getStepAmount: getStepAmount,
        getActiveWallet: activeWallet,
        setActiveWalletAsync: setActiveWalletAsync,
        checkMyCurrentBets: checkMyCurrentBets,

        getUserBetHistory: getUserBetHistory,
        // getBetHistory: getBetHistory,
    };
})();

export default UGG;
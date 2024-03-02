import {
    Howler,
    Howl
} from "howler";
import {
    isMobile
} from "pixi.js";

export class SoundObject {
    constructor(key, sound, volume = 1, loop = false, exclude = false, isBgSound = false) {
        this.key = key;
        this.sound = sound;
        this.volume = volume;
        this.loop = loop;
        this.exclude = exclude;
        this.isBgSound = isBgSound;

        this.playOnEnd = "";
    }
}

window.HowlerSoundManager = {
    sounds: {},
    muteSound: true,
    gameName: null,
    isSoundControllerOpen: false,
    canOpenSoundSettings: false,
    isBgSoundPlaying: false,
    isGameSoundsPlaying: false,

    init(soundObjects, gName, canOpenSoundSettings = false) {
        // console.warn("sound manager constructor", gName);
        this.gameName = gName;
        Howler.autoUnlock = false;
        Howler.mute(this.muteSound);

        // console.log("howler init mute sound: ", this.muteSound);

        document.addEventListener("visibilitychange", (event) => {
            // console.log("document visibilitychange", event, this.muteSound);
            if (document.visibilityState === "visible") {
                Howler.mute(this.muteSound);
            } else {
                Howler.mute(true);
            }
        });

        this.getSoundStateToLocalStorage();

        this.addListeners();
        this.initGlobalSoundEvents();

        this.addSounds(soundObjects);
    },

    addListeners() {
        $(".volume").on("pointerdown", () => {
            // console.warn("sound icon click: ", isMobile.any, this.canOpenSoundSettings, this.isSoundControllerOpen);
            if (isMobile.any && this.canOpenSoundSettings) {
                if (this.isSoundControllerOpen == true) {
                    this.isSoundControllerOpen = false;
                    $("#game-audio-controllers").removeClass("open");
                } else {
                    this.isSoundControllerOpen = true;
                    $("#game-audio-controllers").addClass("open");
                }

                this.checkSoundSwichButtonStates();
                this.muteBackgroundSound();
                this.muteGameSoundsSound();
                return;
            }

            this.muteSound = !this.muteSound;
            Howler.mute(this.muteSound);

            this.updateVolumeIndicator();
            this.setSoundStateToLocalStorage();

            this.isBgSoundPlaying = this.isGameSoundsPlaying = !this.muteSound ? true : false;

            this.checkSoundSwichButtonStates();
            this.muteBackgroundSound();
            this.muteGameSoundsSound();
        });

        if (!isMobile.any) {
            $(".volume").on("mouseover", () => {
                if (this.canOpenSoundSettings) {
                    this.isSoundControllerOpen = true;
                    $("#game-audio-controllers").addClass("open");
                }
            });
            $("#game-audio-controllers").on("mouseleave", (e) => {
                this.isSoundControllerOpen = false;
                $("#game-audio-controllers").removeClass("open");
            });
        }

        $("#soundOn").on("click", () => {
            this.muteSound = false;
            Howler.mute(this.muteSound);
            if (!this.isBgSoundPlaying && !this.isGameSoundsPlaying) {
                this.isBgSoundPlaying = true;
                this.isGameSoundsPlaying = true;
            }

            this.updateVolumeIndicator();
            this.setSoundStateToLocalStorage();
            this.play("make-bet");
            this.checkSoundSwichButtonStates();
            this.muteBackgroundSound();
            this.muteGameSoundsSound();

            $("#soundPopup").hide();
        });
        $("#soundOff").on("click", () => {
            this.muteSound = true;
            Howler.mute(this.muteSound);

            this.isBgSoundPlaying = false;
            this.isGameSoundsPlaying = false;
            this.updateVolumeIndicator();
            this.setSoundStateToLocalStorage();
            this.checkSoundSwichButtonStates();

            $("#soundPopup").hide();
        });

        $("#background-audio-controller").on("click", () => {
            this.isBgSoundPlaying = !this.isBgSoundPlaying;
            if (this.isBgSoundPlaying) {
                this.muteSound = false;
                Howler.mute(this.muteSound);
            }

            this.updateVolumeIndicator();
            this.muteBackgroundSound();
            this.setSoundStateToLocalStorage();
            this.checkSoundSwichButtonStates();
        });

        $("#game-audio-controller").on("click", () => {
            this.isGameSoundsPlaying = !this.isGameSoundsPlaying;

            if (this.isGameSoundsPlaying) {
                this.muteSound = false;
                Howler.mute(this.muteSound);
            }

            this.updateVolumeIndicator();
            this.muteGameSoundsSound();
            this.setSoundStateToLocalStorage();
            this.checkSoundSwichButtonStates();
        });
    },
    initGlobalSoundEvents() {
        // console.warn("init global sound events howler");
        // $(".input-btn.minus").on("click", () => {
        //   console.log("bet-minus", HowlerSoundManager);
        //   this.play("bet-minus");
        // });
        // $(".input-btn.plus").on("click", () => {
        //   this.play("bet-plus");
        // });
        $(".checkbox-wrapper label").on("click", (e) => {
            this.play("autoplay");
        });
        $(".bet-button").on("click", () => {
            $(".bet-button").blur();
            this.play("make-bet");
        });
        $(".cashout-button").on("click", () => {
            this.play("money-pickup");
        });
        $(".bet-fixed-amount-wrapper").on("click", () => {
            this.play("button-click");
        });
        $(".next-round-bet").on("click", () => {
            this.play("make-bet");
        });
        $(".cancel-next-round-bet").on("click", () => {
            this.play("cancel-bet");
        });
        $(".chat-header").on("click", () => {
            this.play("button-click");
        });
        $(".my-bets-header .tab").on("click", () => {
            this.play("button-click");
        });
        $(".wallet-wrapper").on("click", () => {
            this.play("button-click");
        });
    },

    getSoundStateToLocalStorage() {
        try {
            const isMuted = JSON.parse(localStorage.getItem(this.gameName + "-howler-sound-muted"));
            this.isBgSoundPlaying = JSON.parse(localStorage.getItem(this.gameName + "-howler-background-sound-playing"));
            this.isGameSoundsPlaying = JSON.parse(localStorage.getItem(this.gameName + "-howler-game-sounds-playing"));

            if (isMuted === null) {
                this.muteSound = true;

                this.setSoundStateToLocalStorage();
            } else {
                this.muteSound = isMuted;
            }

            Howler.mute(this.muteSound);
            this.updateVolumeIndicator();
        } catch (err) {
            this.muteSound = true;
            Howler.mute(this.muteSound);
        } finally {
            this.muteSound = true;
            Howler.mute(this.muteSound);
        }

        this.checkSoundSwichButtonStates();
        this.muteBackgroundSound();
        this.muteGameSoundsSound();
    },

    setSoundStateToLocalStorage() {
        try {
            localStorage.setItem(`${this.gameName}-howler-sound-muted`, this.muteSound);
            localStorage.setItem(`${this.gameName}-howler-background-sound-playing`, this.isBgSoundPlaying);
            localStorage.setItem(`${this.gameName}-howler-game-sounds-playing`, this.isGameSoundsPlaying);
        } catch (error) {}
    },
    checkSoundSwichButtonStates() {
        this.isBgSoundPlaying ?
            $("#background-audio-controller .switch-button").addClass("active") :
            $("#background-audio-controller .switch-button").removeClass("active");

        this.isGameSoundsPlaying ? $("#game-audio-controller .switch-button").addClass("active") : $("#game-audio-controller .switch-button").removeClass("active");

        if (!this.isBgSoundPlaying && !this.isGameSoundsPlaying) {
            this.muteSound = true;
            Howler.mute(this.muteSound);
            this.updateVolumeIndicator();
        }
    },

    addSounds(soundObjects) {
        // console.log("sound objects: ", soundObjects);
        if (!soundObjects) return;

        soundObjects.forEach((soundObj) => {
            this.sounds[soundObj.key] = {
                key: soundObj.key,
                sound: new Howl({
                    src: [soundObj.sound + `?version=${UGG.BUILD_ID}`],
                    volume: soundObj.volume,
                    loop: soundObj.loop,
                    onend: () => {
                        // console.warn(soundObj.key, "sound ended!");
                        this.logSounds(soundObj.key, "ended");

                        if (soundObj.playOnEnd != "") {
                            this.play(soundObj.key, false);
                        }
                    },
                }),
                volume: soundObj.volume,
                loop: soundObj.loop,
                exclude: soundObj.exclude,
                isBgSound: soundObj.isBgSound,
            };
        });
    },

    replaceSound(key, audioData, volume = 1) {
        const existingSound = this.sounds[key];

        if (existingSound) {
            existingSound.sound = new Howl({
                src: audioData,
                volume: volume,
                loop: existingSound.loop,
            });
        }
    },

    muteBackgroundSound() {
        for (const key in this.sounds) {
            if (this.sounds[key].isBgSound) {
                this.sounds[key].sound.mute(!this.isBgSoundPlaying);
            }
        }
    },

    muteGameSoundsSound() {
        for (const key in this.sounds) {
            if (!this.sounds[key].isBgSound) {
                this.sounds[key].sound.mute(!this.isGameSoundsPlaying);
            }
        }
    },

    play(key, stopAll = true) {
        // console.warn("playing howler sound", key, stopAll);
        if (stopAll) {
            this.stopAll();
        }

        if (this.sounds[key].sound.playing()) {
            this.sounds[key].sound.seek(0);
            this.logSounds(key, "play");
        } else {
            this.sounds[key].sound.play();
            this.logSounds(key, "play");
        }
    },

    stopAll() {
        for (const key in this.sounds) {
            if (!this.sounds[key].exclude) {
                this.stop(key);
            }
        }
    },

    stop(key) {
        const currentSound = this.sounds[key].sound;
        if (currentSound && currentSound.playing()) {
            currentSound.pause();
            currentSound.seek(0);

            this.logSounds(key, "stop");
        }
    },

    updateVolumeIndicator() {
        if (this.muteSound) $(".volume").addClass("muted");
        else $(".volume").removeClass("muted");
    },

    activateSoundSettingsPopup(activate = false) {
        this.canOpenSoundSettings = activate;
    },

    logSounds(key, action) {
        const queryObject = UGG.queryString;
        // console.warn(key, action);
        if (queryObject.logsounds == "enabled") {
            const $logWrapper = $("#log");
            const $actionHTML = $(`<span class="${action}">sound: '${key}' action: ${action}</span>`);
            $logWrapper.prepend($actionHTML);

            $("span:nth-child(200)", $logWrapper).nextAll().remove();
        }
    },
};
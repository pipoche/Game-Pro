import gsap from "gsap";
import {
    Application,
    Container,
    Graphics
} from "pixi.js";
import {
    IceBoxesRow
} from "./ice-boxes-row.view";

export class GameView {
    constructor(canvasRef, rowCount, colCount) {
        console.log("game constructor");

        this.GAME_WIDTH = 1575;
        this.GAME_HEIGHT = 700;

        this.rowCount = rowCount;
        this.colCount = colCount;
        this.coefs = [];

        this.iceBoxRows = [];

        this.application = new Application({
            width: this.GAME_WIDTH,
            height: this.GAME_HEIGHT,
            view: canvasRef,
            antialias: true,
            backgroundColor: 0x0c121e,
        });
        this.stage = this.application.stage;
        this.bg = new Graphics();
        this.bg.beginFill(0x131926);
        this.bg.drawRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
        this.bg.endFill();
        this.stage.addChild(this.bg);

        this.iceBoxContainer = new Container();
        this.stage.addChild(this.iceBoxContainer);

        this.application.loader.defaultQueryString = `version=${UGG.BUILD_ID}`;
        this.application.loader.add(GameResources());
        this.application.loader.load((loader, res) => {
            RESOURCES.loaded = res;

            this.initGame();
            this.initListeners();

            CANVAS_EMITTER.emit(CANVAS_EMITTER.RESOURCES_LOADED, {
                loaded: true
            });
        });
    }

    initGame() {
        console.log("init game");
    }

    initListeners() {
        console.log("add listeners to game");
    }

    updateBoxDimensions(rowCount, colCount, coefs) {
        this.rowCount = rowCount;
        this.colCount = colCount;
        this.coefs = coefs;

        this.drawIceBoxes();
    }

    drawIceBoxes() {
        if (this.iceBoxRows.length > 0) {
            for (let i = this.iceBoxRows.length - 1; i >= 0; i--) {
                this.iceBoxContainer.removeChild(this.iceBoxRows[i]);
            }
        }

        this.iceBoxRows = [];

        for (let i = 0; i < this.rowCount; i++) {
            const iceBoxRow = new IceBoxesRow(i, this.colCount, this.coefs[i]);
            this.iceBoxContainer.addChild(iceBoxRow);
            iceBoxRow.x = i * iceBoxRow.width;

            this.iceBoxRows.push(iceBoxRow);
        }

        this.resize(this.application.view.width, this.application.view.height);
    }

    drawState(currentBet) {
        if (currentBet.Finished) {
            this.fadeAllRows();

            const currentRowIndex = this.getCurrentRowIndexByOpening(currentBet);

            for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
                const iceBoxRow = this.iceBoxRows[i];
                iceBoxRow.showCrack(currentBet.CurrentState.bn[i].m);
                if (currentBet.CurrentState.bn[i].o != undefined || currentBet.CurrentState.bn[i].o != null) {
                    iceBoxRow.showSuccess(currentBet.CurrentState.bn[i].o);
                }

                if (currentBet.CurrentState.bn[i].o == currentBet.CurrentState.bn[i].m) {
                    iceBoxRow.showIceBreak(currentBet.CurrentState.bn[i].o);
                }
            }
            if (currentBet.WinAmount > 0) {
                if (currentRowIndex >= 0) {
                    this.iceBoxRows[currentRowIndex].showWin(currentBet.CurrentState.bn[currentRowIndex].o);
                }
            }

            this.scrollGameTo(currentRowIndex);
        } else {
            const currentRowIndex = this.getCurrentRowIndex(currentBet);

            for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
                const iceBoxRow = this.iceBoxRows[i];

                // set opacity to non current rows
                iceBoxRow.alpha = i <= currentRowIndex ? 1 : 0.5;
                iceBoxRow.selectable(i == currentRowIndex);

                if (currentBet.CurrentState.bn[i].m != undefined || currentBet.CurrentState.bn[i].m != null) {
                    iceBoxRow.showCrack(currentBet.CurrentState.bn[i].m);
                }
                if (currentBet.CurrentState.bn[i].o != undefined || currentBet.CurrentState.bn[i].o != null) {
                    iceBoxRow.showSuccess(currentBet.CurrentState.bn[i].o);
                }
            }

            if (currentRowIndex > 0) {
                this.iceBoxRows[currentRowIndex - 1].showWin(currentBet.CurrentState.bn[currentRowIndex - 1].o);
            }

            this.scrollGameTo(currentRowIndex);
        }
    }

    startNewGame() {
        for (let i = 0; i < this.iceBoxRows.length; i++) {
            const iceBoxRow = this.iceBoxRows[i];
            iceBoxRow.alpha = i == 0 ? 1 : 0.5;
            iceBoxRow.selectable(i == 0);
        }
    }

    stepResponse(currentBet) {
        // console.log("canvas step response: ", currentBet);

        if (currentBet.Finished) {
            const currentRowIndexByOpening = this.getCurrentRowIndexByOpening(currentBet);

            for (let i = 0; i < currentRowIndexByOpening; i++) {
                const iceBoxRow = this.iceBoxRows[i];

                iceBoxRow.showSuccess(currentBet.CurrentState.bn[i].o);
                iceBoxRow.selectable(i == currentRowIndexByOpening);
            }

            if (currentBet.CurrentState.bn[currentRowIndexByOpening].m == currentBet.CurrentState.bn[currentRowIndexByOpening].o) {
                this.iceBoxRows[currentRowIndexByOpening].showIceBreak(currentBet.CurrentState.bn[currentRowIndexByOpening].o);
            } else {
                this.iceBoxRows[currentRowIndexByOpening].showWin(currentBet.CurrentState.bn[currentRowIndexByOpening].o);
            }

            this.scrollGameTo(currentRowIndexByOpening);
        } else {
            const currentRowIndex = this.getCurrentRowIndex(currentBet);

            // set opacity to non current rows
            for (let i = 0; i < this.iceBoxRows.length; i++) {
                const iceBoxRow = this.iceBoxRows[i];

                // set opacity to non current rows
                iceBoxRow.alpha = i <= currentRowIndex ? 1 : 0.5;
                iceBoxRow.selectable(i == currentRowIndex);
            }

            // show crack
            this.iceBoxRows[currentRowIndex - 1].showCrack(currentBet.CurrentState.bn[currentRowIndex - 1].m);

            // show success animation for step
            this.iceBoxRows[currentRowIndex - 1].showWin(currentBet.CurrentState.bn[currentRowIndex - 1].o);

            // switch old yetis to foots
            for (let i = 0; i < currentRowIndex - 1; i++) {
                this.iceBoxRows[i].showSuccess(currentBet.CurrentState.bn[i].o);
            }

            this.scrollGameTo(currentRowIndex);
        }

        // show all mines
        this.showAllMines(currentBet);
    }

    finishGame(currentBet) {
        this.fadeAllRows();

        // show all mines
        this.showAllMines(currentBet);
    }

    showAllMines(currentBet) {
        for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
            if (currentBet.CurrentState.bn[i].m == undefined || currentBet.CurrentState.bn[i].m == null) continue;
            if (this.iceBoxRows[i].isBroken(currentBet.CurrentState.bn[i].m)) continue;

            this.iceBoxRows[i].showCrack(currentBet.CurrentState.bn[i].m);
        }
    }

    fadeAllRows() {
        for (let i = 0; i < this.iceBoxRows.length; i++) {
            this.iceBoxRows[i].alpha = 0.8;
        }
    }

    getCurrentRowIndex(currentBet) {
        let currentRowIndex = 0;
        for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
            if (currentBet.CurrentState.bn[i].m == null || currentBet.CurrentState.bn[i].m == undefined) {
                currentRowIndex = i;
                break;
            }
        }
        return currentRowIndex;
    }

    getCurrentRowIndexByOpening(currentBet) {
        let currentRowIndex = -1;
        for (let i = 0; i < currentBet.CurrentState.bn.length; i++) {
            if (currentBet.CurrentState.bn[i].o == null || currentBet.CurrentState.bn[i].o == undefined) {
                break;
            }
            currentRowIndex = i;
        }
        return currentRowIndex;
    }

    scrollGame(delta) {
        if (this.iceBoxContainer.width <= this.application.view.width) {
            return;
        }

        gsap.killTweensOf(this.iceBoxContainer);

        const newXPos = this.fixScrollPosition(this.iceBoxContainer.x + 100 * delta);
        gsap.to(this.iceBoxContainer, 0.5, {
            x: newXPos
        });
    }
    scrollGameTo(rowId) {
        if (this.iceBoxContainer.width <= this.application.view.width) {
            return;
        }

        gsap.killTweensOf(this.iceBoxContainer);

        const newXPos = this.fixScrollPosition((this.iceBoxContainer.width / this.iceBoxRows.length) * -(rowId - 2.5));
        gsap.to(this.iceBoxContainer, 0.2, {
            x: newXPos
        });
    }
    scrollGameBy(scrollWidth) {
        if (this.iceBoxContainer.width <= this.application.view.width) {
            return;
        }

        gsap.killTweensOf(this.iceBoxContainer);

        const newXPos = this.fixScrollPosition(this.iceBoxContainer.x + scrollWidth);
        gsap.to(this.iceBoxContainer, 0.2, {
            x: newXPos
        });
    }
    fixScrollPosition(newXPos) {
        newXPos = Math.min(0, newXPos);
        newXPos = Math.max(this.application.view.width - this.iceBoxContainer.width, newXPos);
        return newXPos;
    }

    addResourcesToLoad() {
        this.application.loader.defaultQueryString = `version=${UGG.BUILD_ID}`;

        // this.application.loader.add("ice_box", "icefield/assets/ice-box.svg");
        this.application.loader.add("ice_success", "icefield/assets/ice-success.svg");
        this.application.loader.add("ice_crack", "icefield/assets/ice-crack.svg");
        this.application.loader.add("yeti_foots", "icefield/assets/foots.svg");
        // this.application.loader.add("yeti_jump", "icefield/assets/yeti-jump.png");

        for (let i = 1; i <= 10; i++) {
            this.application.loader.add(`ice_break_${i - 1}`, `icefield/assets/ice-break/ice-break-${i}.png`);
        }
        for (let i = 1; i <= 7; i++) {
            this.application.loader.add(`yeti_jump_${i - 1}`, `icefield/assets/yeti-jump/yeti-jump-${i}.png`);
        }
        for (let i = 1; i <= 12; i++) {
            this.application.loader.add(`jump_effect_${i - 1}`, `icefield/assets/jump-effect/jump-effect-${i}.png`);
        }

        this.application.loader.add("ProximaNovaBold", "static/fonts/ProximaNova-Bold.woff2");
    }

    resize(width, height) {
        // console.log("canvas resize method: ", width, height);

        this.application.view.width = width;
        this.application.view.height = height;

        this.bg.visible = window.innerWidth > 575;

        const scale = Math.min(1, height / this.GAME_HEIGHT);
        this.iceBoxContainer.scale.set(scale);

        this.iceBoxContainer.x = Math.max((width - this.iceBoxContainer.width) / 2, 0);
        this.iceBoxContainer.y = (height - this.iceBoxContainer.height) / 2;
    }
}

export const GameResources = () => {
    const resToLoad = [];

    resToLoad.push({
        name: "ProximaNovaBold",
        url: "static/fonts/ProximaNova-Bold.woff2"
    });

    resToLoad.push({
        name: "bgBlur",
        url: "teleport/assets/bg-blur.png"
    });

    resToLoad.push({
        name: "ice_success",
        url: "icefield/assets/ice-success.svg"
    });
    resToLoad.push({
        name: "ice_crack",
        url: "icefield/assets/ice-crack.svg"
    });
    resToLoad.push({
        name: "yeti_foots",
        url: "icefield/assets/foots.svg"
    });

    for (let i = 1; i <= 10; i++) {
        resToLoad.push({
            name: `ice_break_${i - 1}`,
            url: `icefield/assets/ice-break/ice-break-${i}.png`
        });
    }
    for (let i = 1; i <= 7; i++) {
        resToLoad.push({
            name: `yeti_jump_${i - 1}`,
            url: `icefield/assets/yeti-jump/yeti-jump-${i}.png`
        });
    }
    for (let i = 1; i <= 12; i++) {
        resToLoad.push({
            name: `jump_effect_${i - 1}`,
            url: `icefield/assets/jump-effect/jump-effect-${i}.png`
        });
    }

    return resToLoad;
};
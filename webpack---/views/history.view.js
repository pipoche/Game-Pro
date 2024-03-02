import {
    Application,
    Container,
    Graphics
} from "pixi.js";
import {
    IceBoxesRow
} from "./ice-boxes-row.view";

export class HistoryView {
    constructor(container, data, RTP = null, isAdmin = false) {
        this.parentContainer = container;
        this.BetData = data;
        this.CurrentState = JSON.parse(data.CurrentStateJson);
        this.RTP = isAdmin ? RTP : UGG.getGameState() ? .RTP;

        this.isAdminView = isAdmin;

        this.GAME_WIDTH = 1575;
        this.GAME_HEIGHT = 700;

        this.rowCount = JSON.parse(data.ParamsJson).l;
        this.colCount = JSON.parse(data.ParamsJson).w;
        this.coefs = [];

        this.iceBoxRows = [];
        const appConfig = {
            width: this.GAME_WIDTH,
            height: this.GAME_HEIGHT,
            antialias: true,
            backgroundColor: 0x0c121e,
        };
        if (this.isAdminView) {
            // appConfig.resizeTo = this.parentContainer;
        }
        this.application = new Application(appConfig);
        this.parentContainer.appendChild(this.application.view);
        this.stage = this.application.stage;
        window.__PIXI_APP__ = this.application;

        this.bg = new Graphics();
        this.bg.beginFill(0x131926);
        this.bg.drawRect(0, 0, this.GAME_WIDTH, this.GAME_HEIGHT);
        this.bg.endFill();
        this.stage.addChild(this.bg);

        this.iceBoxContainer = new Container();
        this.stage.addChild(this.iceBoxContainer);

        if (this.isAdminView) {
            this.application.loader.defaultQueryString = `version=${UGG.BUILD_ID}`;
            this.application.loader.add(GameResources());
            this.application.loader.load((loader, res) => {
                RESOURCES.loaded = res;

                this.initGame();
            });
        } else {
            this.initGame();
        }
    }

    initGame() {
        this.updateBoxDimensions(this.rowCount, this.colCount);
        this.drawState();
    }

    updateBoxDimensions(rowCount, colCount, coefs) {
        this.rowCount = rowCount;
        this.colCount = colCount;

        this.coefs = [];
        for (let i = 0; i < this.rowCount; i++) {
            // this.coefs.push(Math.floor(UGG.getGameState()?.RTP * Math.pow(this.colCount / (this.colCount - 1), i + 1) * 100) / 100);
            this.coefs.push(GetNumStr(this.RTP * Math.pow(this.colCount / (this.colCount - 1), i + 1)));
        }

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

    drawState() {
        this.fadeAllRows();

        const currentRowIndex = this.getCurrentRowIndexByOpening(this.CurrentState);

        for (let i = 0; i < this.CurrentState.bn.length; i++) {
            const iceBoxRow = this.iceBoxRows[i];
            iceBoxRow.showCrack(this.CurrentState.bn[i].m);
            if (this.CurrentState.bn[i].o != undefined || this.CurrentState.bn[i].o != null) {
                iceBoxRow.showSuccess(this.CurrentState.bn[i].o);
            }

            if (this.CurrentState.bn[i].o == this.CurrentState.bn[i].m) {
                iceBoxRow.showIceBreak(this.CurrentState.bn[i].o);
            }
        }
        if (this.BetData.WinAmount > 0) {
            if (currentRowIndex >= 0) {
                this.iceBoxRows[currentRowIndex].showWin(this.CurrentState.bn[currentRowIndex].o);
            }
        }
    }

    fadeAllRows() {
        for (let i = 0; i < this.iceBoxRows.length; i++) {
            this.iceBoxRows[i].alpha = 0.8;
        }
    }

    getCurrentRowIndexByOpening(CurrentState) {
        let currentRowIndex = -1;
        for (let i = 0; i < CurrentState.bn.length; i++) {
            if (CurrentState.bn[i].o == null || CurrentState.bn[i].o == undefined) {
                break;
            }
            currentRowIndex = i;
        }
        return currentRowIndex;
    }

    resize() {
        if (this.isAdminView) {
            const parentElementWidth = this.application.view.parentElement.getBoundingClientRect().width;
            this.application.view.width = parentElementWidth * 0.8;
            this.application.view.height = (this.application.view.width / this.GAME_WIDTH) * this.GAME_HEIGHT;
            this.application.view.style.transform = "unset";

            this.iceBoxContainer.width = this.application.view.width;
            this.iceBoxContainer.height = this.application.view.height;

            console.log(this.iceBoxContainer.width, this.iceBoxContainer.height);
        } else {
            this.application.view.width = Math.min(this.colCount * 110, this.parentContainer.getBoundingClientRect().width - 20);
            this.application.view.height = (this.application.view.width / this.GAME_WIDTH) * this.GAME_HEIGHT;

            this.iceBoxContainer.width = this.application.view.width;
            this.iceBoxContainer.height = this.application.view.height;
        }

        const parentheight = this.application.view.height + 60;
        $(this.parentContainer).closest(".bet-history-content").height(parentheight);
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
import {
    Container,
    Text
} from "pixi.js";
import {
    IceBoxView
} from "./ice-box.view";

export class IceBoxesRow extends Container {
    constructor(rowid, boxCount, rowCoef) {
        super();

        this.rowid = rowid;
        this.boxCount = boxCount;
        this.rowCoef = rowCoef;
        this.iceBoxes = [];

        this.draw();
    }

    draw() {
        this.iceBoxes = [];

        const coef = new Text(GetNumStr(this.rowCoef) + " X", {
            fill: 0xa1f15b,
            fontSize: 16,
            fontFamily: "ProximaNovaBold",
        });
        this.addChild(coef);

        for (let i = 0; i < this.boxCount; i++) {
            const iceBox = new IceBoxView(i);
            this.addChild(iceBox);
            iceBox.y = coef.height + 5 + (this.boxCount - i - 1) * iceBox.height;

            this.iceBoxes.push(iceBox);
        }

        coef.x = (this.width - coef.width) / 2;
    }

    selectable(enabled) {
        for (let i = 0; i < this.iceBoxes.length; i++) {
            const iceBox = this.iceBoxes[i];
            iceBox.interactive = enabled;
            iceBox.buttonMode = enabled;

            iceBox.on("click", () => {
                this.selectIceBox(i);
            });
            iceBox.on("touchstart", () => {
                this.selectIceBox(i);
            });
        }
    }

    selectIceBox(index) {
        CANVAS_EMITTER.emit(CANVAS_EMITTER.OPEN_ICE_BOX, {
            rowid: this.rowid,
            colid: index,
        });
    }

    showWin(boxIndex) {
        this.iceBoxes[boxIndex].showWin();
    }
    showSuccess(boxIndex) {
        this.iceBoxes[boxIndex].showSuccess();
    }
    showCrack(boxIndex) {
        this.iceBoxes[boxIndex].showCrack();
    }
    showIceBreak(boxIndex) {
        this.iceBoxes[boxIndex].showIceBreak();
    }

    isBroken(boxIndex) {
        return this.iceBoxes[boxIndex].isBroken();
    }
}
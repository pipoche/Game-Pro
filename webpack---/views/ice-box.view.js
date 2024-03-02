import gsap from "gsap";
import {
    AnimatedSprite,
    Container,
    Sprite,
    Texture
} from "pixi.js";

export class IceBoxView extends Container {
    constructor(index) {
        super();

        this.BOX_WIDTH = 110;
        this.BOX_HEIGHT = 110;

        this.index = index;

        this.iceBreak = null;
        this.succesBox = null;

        this.iceCrack = null;
        this.yetiFoots = null;
        this.yetiJump = null;

        this.yeti = null;

        this.iceBreakStarted = false;
        this.isIceBroken = false;

        this.draw();
    }

    draw() {
        const iceBreakFrames = this.getAnimationTextures("ice_break_", 10);
        this.iceBreak = new AnimatedSprite(iceBreakFrames);
        this.addChild(this.iceBreak);
        this.iceBreak.loop = false;
        this.iceBreak.width = this.BOX_WIDTH;
        this.iceBreak.height = this.BOX_HEIGHT;
        this.iceBreak.animationSpeed = 0.6;

        this.succesBox = new Sprite(RESOURCES.loaded["ice_success"].texture);
        this.addChild(this.succesBox);
        this.succesBox.x = 5;
        this.succesBox.y = 5;

        this.iceCrack = new Sprite(RESOURCES.loaded["ice_crack"].texture);
        this.addChild(this.iceCrack);
        this.iceCrack.x = 5;
        this.iceCrack.y = 5;

        this.yetiFoots = new Sprite(RESOURCES.loaded["yeti_foots"].texture);
        this.addChild(this.yetiFoots);
        this.yetiFoots.anchor.set(0.5);
        this.yetiFoots.x = this.iceBreak.width / 2;
        this.yetiFoots.y = this.iceBreak.height / 2;

        const yetiJumpFrames = this.getAnimationTextures("jump_effect_", 12);
        yetiJumpFrames.push(Texture.EMPTY);
        this.yetiJump = new AnimatedSprite(yetiJumpFrames);
        this.addChild(this.yetiJump);
        this.yetiJump.loop = false;
        this.yetiJump.animationSpeed = 0.6;
        this.yetiJump.x = 5;
        this.yetiJump.y = 5;

        const yetiFrames = this.getAnimationTextures("yeti_jump_", 7);
        this.yeti = new AnimatedSprite(yetiFrames);
        this.addChild(this.yeti);
        this.yeti.anchor.set(0.5);
        this.yeti.loop = false;
        this.yeti.x = this.iceBreak.width / 2;
        this.yeti.y = this.iceBreak.height / 2;
        this.yeti.animationSpeed = 0.5;

        this.hideAllExpectIceBox();
    }

    getAnimationTextures(prefix, frameCount) {
        const animFrames = [];
        for (let i = 0; i < frameCount; i++) {
            animFrames.push(RESOURCES.loaded[`${prefix}${i}`].texture);
        }
        return animFrames;
    }

    showWin() {
        // console.log("showWin");
        this.hideAllExpectIceBox();

        this.succesBox.visible = true;

        this.yeti.visible = true;
        this.yeti.gotoAndPlay(0);

        this.yeti.onFrameChange = (frame) => {
            if (frame >= 3) {
                this.yetiJump.visible = true;
                this.yetiJump.gotoAndPlay(0);
            }
        };
    }
    showSuccess() {
        // console.log("showSuccess");
        this.hideAllExpectIceBox();

        this.succesBox.visible = true;
        this.yetiFoots.visible = true;
    }
    showCrack() {
        // console.log("showCrack");
        this.hideAllExpectIceBox();

        this.iceCrack.visible = true;
    }
    showIceBreak() {
        // console.log("showIceBreak");
        this.hideAllExpectIceBox();

        this.isIceBroken = true;

        this.yeti.visible = true;
        this.yeti.gotoAndPlay(0);
        this.yeti.onFrameChange = (frame) => {
            if (frame >= 3 && this.iceBreakStarted == false) {
                this.iceBreakStarted = true;

                this.yetiJump.visible = true;
                this.yetiJump.gotoAndPlay(0);

                this.iceBreak.gotoAndPlay(0);
            }
        };
        this.yeti.onComplete = () => {
            gsap.to(this.yeti, 0.3, {
                rotation: Math.PI,
                alpha: 0
            });
            gsap.to(this.yeti.scale, 0.3, {
                x: 0,
                y: 0
            });
        };
    }

    isBroken() {
        return this.isIceBroken;
    }

    hideAllExpectIceBox() {
        this.succesBox.visible = false;
        this.iceCrack.visible = false;
        this.yetiFoots.visible = false;
        this.yetiJump.visible = false;
        this.yeti.visible = false;
    }
}
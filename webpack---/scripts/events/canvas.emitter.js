export default class CanvasEmitter {
    constructor() {
        this.RESOURCES_LOADED = "ResourcesLoaded";
        this.RESOURCES = "Resources";
        this.PLAY_SOUND = "PlaySound";

        // icefield
        this.STEP_ACTION = "StepAction";
        this.OPEN_ICE_BOX = "OpenIceBox";

        // teleport
        this.SWITCH_TELEPORT_BOARD = "SwitchTeleportBoard";

        // hilo
        this.MOBILE_SLIDER_STEP_CHANGE = "MobileSliderStepChange";
        this.CARD_FLIPPED = "CardFlipped";

        // dice
        this.COLOR_CHANGED = "ColorChanged";
        this.POSITION_CHANGED = "PositionChanged";
        this.CHANCE_CHANGED = "ChanceChanged";
        this.GET_STATE = "GetState";

        // ladder
        this.CONTROLLER_CLICKED = "ControllerClicked";
        this.LADDER_ANIMATION_COMPLETE = "LadderAnimationComplete";

        // roulette
        this.ROULETTE_GOT_SETTINGS = "RouletteGotSettings";
        this.ROULETTE_SWITCH_BOARD = "RouletteSwitchBoard";
        this.ROULETTE_LEFT_BUTTON = "RouletteLeftButton";
        this.ROULETTE_RIGHT_BUTTON = "RouletteRightButton";
        this.ROULETTE_ACTIVE_CHIP = "RouletteActiveChip";
        this.ROULETTE_WHEEL_ANIMATION = "RouletteWheelAnimation";
        this.ROULETTE_WHEEL_ANIMATION_ENDED = "RouletteWheelAnimationEnded";
        this.ROULETTE_PLACE_CLICK = "RouletteMainBoardClick";
        this.ROULETTE_ADD_CHIPS_ON_PLACES = "AddChipsOnPlaces";
        this.ROULETTE_HISTORY_UPDATE = "RoulettehistoryUpdate";
        this.ROULETTE_ADD_BET_HISTORY = "RouletteAddBetHistory";
        this.ROULETTE_BET_PERMISSION = "RouletteBetPermission";
        this.ROULETTE_BET = "RouletteBet";
        this.ROULETTE_BOARD_CHANGED = "RouletteBoardChanged";
        this.ROULETTE_BOARD_HIGHLIGHT_FINISHED = "RouletteBoardHighlightFinished";
        this.ROULETTE_PROGRESSBAR_END = "RouletteProgressbarEnd";
        this.ROULETTE_HOT_AND_COLD_NUMBERS = "RouletteHotAndColdNumbers";
        this.ROULETTE_END_ANIMATIONS = "RouletteEndAnimations";
        this.ROULETTE_SPIN_MESSAGE = "RouletteSpinMessage";
        this.ROULETTE_GOT_WINNING_AMOUNT = "RouletteGotWinningAmountMessage";

        // armada
        this.ARMADA_GAME_ENDED = "ArmadaGameEnded";
        this.ARMADA_SCELETON_PLAYED = "ArmadaSceletonAnimationPlayed";
        this.ARMADA_STEP_COMPLETED = "ArmadaStepCompleted";

        // popcorn
        this.GRAIN_ANIMATION_ENDED = "GrainAnimationEnded";

        // blakcjack
        this.BLACKJACK_DEALER_DISTRIBUTION_COMPLETE = "BlackjackDistributionLoaded";
        this.BLACKJACK_ANIMATION_END = "BlackjackAnimationEnd";
        this.BLACKJACK_DISTRIBUTE_DEALER_CARDS = "BlackjackDistributeDealerCards";

        //blackjack_virtual
        this.BLACKJACK_VIRTUAL_ACTION_EVENT = "BlackjackVirtualActionAEvent";
        this.BLACKJACK_VIRTUAL_CARDS_QUANTITY = "BlackjackVirtualCardsQuantity";
        this.BLACKJACK_VIRTUAL_CARDS_SUM_UPDATE = "BlackjackVirtualCardsSumUpdate";

        // doors
        this.DOORS_TRY_TO_OPEN = "DoorsTryToOpenDoor";
        this.DOORS_DOOR_OPENED = "DoorsDoorOpened";
        this.DOORS_PASSED = "DoorsPassed";
        this.DOORS_ANIMATION_ENDED = "DoorsAnimationEnded";

        // omerta
        this.OMERTA_OPEN_ITEM = "OmertaOpenItem";

        this._events = {};
    }

    emit(name, data = null) {
        if (!this._events[name]) {
            // throw new Error(`Can't emit an event. Event "${name}" doesn't exits.`);
            this._events[name] = {
                listeners: [],
                data: null
            };
        }

        this._events[name].data = data;
        this._events[name].listeners.forEach((callback) => {
            callback(data);
        });
    }

    on(name, listener) {
        if (!this._events[name]) {
            this._events[name] = {
                listeners: [],
                data: null
            };
        }

        this._events[name].listeners.push(listener);
    }

    onWithData(name, listener) {
        if (!this._events[name]) {
            this._events[name] = {
                listeners: [],
                data: null
            };
        }

        this._events[name].listeners.push(listener);
        listener(this._events[name].data);
    }

    removeListener(name, listenerToRemove) {
        if (!this._events[name]) {
            throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
        }

        const filterListeners = (listener) => listener !== listenerToRemove;

        this._events[name].listeners = this._events[name].listeners.filter(filterListeners);
    }

    getLastData(name) {
        if (!this._events[name]) {
            return null;
        }

        return this._events[name].data;
    }
}
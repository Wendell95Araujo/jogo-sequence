
window["GD_OPTIONS"] = {
    "gameId": "f1ed100abf184551a4d2735d5fd9674f",
    "onEvent": function(event) {
        switch (event.name) {
            case "SDK_GAME_START":
                if (typeof resumeGameSound === 'function') resumeGameSound();
                break;
            case "SDK_GAME_PAUSE":
                if (typeof pauseGameSound === 'function') pauseGameSound();
                break;
            case "SDK_GDPR_TRACKING":
                break;
            case "SDK_REWARDED_WATCH_COMPLETE":
                window.dispatchEvent(new Event('gd_reward_complete'));
                break;
        }
    },
};

function pauseGameSound() {
    const board = document.getElementById("board");
    if (board) board.style.pointerEvents = "none";
}

function resumeGameSound() {
    const board = document.getElementById("board");
    if (board) board.style.pointerEvents = "auto";
}
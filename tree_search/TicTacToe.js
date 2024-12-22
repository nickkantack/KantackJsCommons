import { Game } from "./Game.js";

class TicTacToe extends Game {

    numberOfPlayers;
    board;
    dimension;
    static DEFAULT_SQUARE_VALUE = -1;
    static NO_WINNER_PLAYER_INDEX = -1;
    static ROW_OUT_OF_BOUNDS_ERROR_MESSAGE = "Row index out of bounds";
    static COL_OUT_OF_BOUNDS_ERROR_MESSAGE = "Column index out of bounds";
    static SQUARE_ALREADY_OCCUPIED_ERROR_MESSAGE = "Cannot play on a square where a player has already played";
    static SQUARE_NOT_OCCUPIED_ERROR_MESSAGE = "Cannot undo a play on a square that is currently empty";
    static MOVE_DELIMITER = ",";
    static BOARD_TEXT_GAP = "    ";
    static BOARD_BLANK_CHARACTER = "_";

    constructor() {
        super();
        this.playerTurnIndex = 0;
        this.numberOfPlayers = 2;
        this.dimension = 3;
        this.reset();
    }

    static GET_MOVE_AS_STRING(row, col) {
        return row + TicTacToe.MOVE_DELIMITER + col;
    }

    reset() {
        this.board = [];
        for (let row = 0; row < this.dimension; row++) {
            let newRow = [];
            for (let col = 0; col < this.dimension; col++) {
                newRow.push(TicTacToe.DEFAULT_SQUARE_VALUE);
            }
            this.board.push(newRow);
        }
        this.playerTurnIndex = 0;
    }

    getBoardAsString() {
        let boardString = "";
        for (let row = 0; row < this.dimension; row++) {
            for (let col = 0; col < this.dimension; col++) {
                boardString += this.board[row][col] !== TicTacToe.DEFAULT_SQUARE_VALUE ? this.board[row][col] : TicTacToe.BOARD_BLANK_CHARACTER;
                boardString += TicTacToe.BOARD_TEXT_GAP;
            }
            if (row < this.dimension - 1) {
                boardString += "\n\n";
            }
        }
        return boardString;
    }

    makeMove(moveString) {

        if (moveString.match(TicTacToe.MOVE_DELIMITER).length !== 1) {
            throw new Error("Move string must contain exactly 1 comma");
        }

        let parts = moveString.split(TicTacToe.MOVE_DELIMITER);
        let desiredRow = parseInt(parts[0]);
        let desiredCol = parseInt(parts[1]);

        if (desiredRow < 0 || desiredRow >= this.dimension) {
            throw new Error(TicTacToe.ROW_OUT_OF_BOUNDS_ERROR_MESSAGE);
        }
        if (desiredCol < 0 || desiredCol >= this.dimension) {
            throw new Error(TicTacToe.COL_OUT_OF_BOUNDS_ERROR_MESSAGE);
        }

        if (this.board[desiredRow][desiredCol] !== TicTacToe.DEFAULT_SQUARE_VALUE) {
            throw new Error(TicTacToe.SQUARE_ALREADY_OCCUPIED_ERROR_MESSAGE);
        }

        this.board[desiredRow][desiredCol] = this.playerTurnIndex;

        // Next player's turn
        this.playerTurnIndex = (this.playerTurnIndex + 1) % this.numberOfPlayers;

    }

    unmakeMove(moveString) {
        if (moveString.match(TicTacToe.MOVE_DELIMITER).length !== 1) {
            throw new Error("Move string must contain exactly 1 comma");
        }

        let parts = moveString.split(TicTacToe.MOVE_DELIMITER);
        let desiredRow = parseInt(parts[0]);
        let desiredCol = parseInt(parts[1]);

        if (desiredRow < 0 || desiredRow >= this.dimension) {
            throw new Error(TicTacToe.ROW_OUT_OF_BOUNDS_ERROR_MESSAGE);
        }
        if (desiredCol < 0 || desiredCol >= this.dimension) {
            throw new Error(TicTacToe.COL_OUT_OF_BOUNDS_ERROR_MESSAGE);
        }

        if (this.board[desiredRow][desiredCol] === TicTacToe.DEFAULT_SQUARE_VALUE) {
            throw new Error(TicTacToe.SQUARE_NOT_OCCUPIED_ERROR_MESSAGE);
        }

        this.board[desiredRow][desiredCol] = TicTacToe.DEFAULT_SQUARE_VALUE;

        // Previous player's turn
        this.playerTurnIndex = (this.playerTurnIndex + 1) % this.numberOfPlayers;
    }

    getMoves() {
        let possibleMoves = [];
        for (let row = 0; row < this.dimension; row++) {
            for (let col = 0; col < this.dimension; col++) {
                if (this.board[row][col] === TicTacToe.DEFAULT_SQUARE_VALUE) {
                    possibleMoves.push(TicTacToe.GET_MOVE_AS_STRING(row, col));
                }
            }
        }
        return possibleMoves;
    }

    /**
     * @return The index of the winning player, or {@link TicTacToe.NO_WINNER_PLAYER_INDEX} if the game is not over or
     * no player has won.
     */
    getWinningPlayerIndex() {
        let winningPlayerIndex = TicTacToe.NO_WINNER_PLAYER_INDEX;

        // Horizontal wins
        for (let i = 0; i < this.dimension; i++) {
            winningPlayerIndex = this.foundThreeInARow(i, 0, 0, 1);
            if (winningPlayerIndex !== TicTacToe.NO_WINNER_PLAYER_INDEX) {
                return winningPlayerIndex;
            }
        }
        // Vertical wins
        for (let i = 0; i < this.dimension; i++) {
            winningPlayerIndex = this.foundThreeInARow(0, i, 1, 0);
            if (winningPlayerIndex !== TicTacToe.NO_WINNER_PLAYER_INDEX) {
                return winningPlayerIndex;
            }
        }
        // Forward slash diagonal win
        winningPlayerIndex = this.foundThreeInARow(0, this.dimension - 1, 1, -1);
        if (winningPlayerIndex !== TicTacToe.NO_WINNER_PLAYER_INDEX) {
            return winningPlayerIndex;
        }
        // Backslash diagonal win
        winningPlayerIndex = this.foundThreeInARow(0, 0, 1, 1);
        if (winningPlayerIndex !== TicTacToe.NO_WINNER_PLAYER_INDEX) {
            return winningPlayerIndex;
        }

        return winningPlayerIndex;
    }

    /**
     *
     * @return index of player with three in a row, or {@link TicTacToe.NO_WINNER_PLAYER_INDEX} if three in a row not found here.
     * @param rowStart the start row
     * @param colStart the start column
     * @param rowInc the increment of the row (0 for horizontal)
     * @param colInc the increment of the column (0 for vertical)
     */
    foundThreeInARow(rowStart, colStart, rowInc, colInc) {
        let candidatePlayerIndex = this.board[rowStart][colStart];
        for (let i = 0; i < this.dimension; i++) {
            if (this.board[rowStart + i * rowInc][colStart + i * colInc] !== candidatePlayerIndex) {
                return TicTacToe.NO_WINNER_PLAYER_INDEX;
            }
        }
        return candidatePlayerIndex;
    }

    makeMoveByIndex(index) {
        let possibleMoves = this.getMoves();
        if (isNaN(parseInt(index))) {
            throw new Error("Couldn't parse move index as an integer");
        }
        index = parseInt(index);
        if (index < 0 || index >= possibleMoves.length) {
            throw new Error("Out of bounds move index. Move index requested was " + index + " but the min is 0 and the"
            + " max is " + possibleMoves.length);
        }
        this.makeMove(possibleMoves[index]);
    }

    copy() {
        let newCopy = new TicTacToe();
        newCopy.playerTurnIndex = this.playerTurnIndex;
        newCopy.numberOfPlayers = this.numberOfPlayers;
        newCopy.dimension = this.dimension;
        newCopy.board = this.board.map(function(column) {
            return column.slice();
        });
        return newCopy;
    }

    getEstimatedWinningProbability(playerIndex) {
        return 0.5;
    }
}

export { TicTacToe }
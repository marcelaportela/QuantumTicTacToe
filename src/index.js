import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
//import io from 'socket.io';

import Graph from './graph.js';
import './index.css';
import './rotation.css';

var g = new Graph();

function QuantumMarks (props){

  let spans;
  if (props.qMarks){
    let marks = Array.from(props.qMarks.filter((x) => x != null));

    if (marks.length >= 1){
      spans = Array.from(marks.slice(0, -1).map((m) => {

      let markCls = classNames("black",
                                {"blue": props.isHighlighted && props.cycleMarks.has(m)},
                                {"red": props.isBeingCollapsed && props.cycleMarks.has(m)})

        return <span className={markCls} key={m}>{ m[0] }<sub>{ m[1] }</sub>, </span>;
      }));

      let lastMark = marks[marks.length - 1];
      let markCls = classNames("black",
                              {"blue": props.isHighlighted && props.cycleMarks.has(lastMark)},
                              {"red": props.isBeingCollapsed && props.cycleMarks.has(lastMark)})

      spans.push(<span className={markCls} key={lastMark}>{ lastMark[0] }<sub>{ lastMark[1] }</sub></span>);
    }
  }
  return <div> {spans} </div>;
}

function Square (props){

    let dashHelper = (
      <div>
        <span className="dashing"><i></i></span>
        <span className="dashing"><i></i></span>
        <span className="dashing"><i></i></span>
        <span className="dashing"><i></i></span>
      </div>
    );

    if (props.cMark){
      let cls = classNames('square', 'classical');

      return (
        <div className={cls} onClick={props.onClick}>
          {dashHelper}
          <div className="marks">
            { props.cMark[0] }<sub>{ props.cMark[1] }</sub>
          </div>
        </div>
      );
    } else{

      let cls = classNames('square',
                          {'rotating-dashed': props.isHighlighted},
                          {'selected': props.isBeingCollapsed})

      return (
        <div className={cls} onClick={props.onClick}>
          {dashHelper}
          <div className="marks">
            <QuantumMarks
              isHighlighted={props.isHighlighted}
              isBeingCollapsed={props.isBeingCollapsed}
              qMarks={props.qMarks}
              cycleMarks={props.cycleMarks}
            />
          </div>
        </div>
      );
    }
}

class Board extends React.Component {

  renderSquare(i) {
    return <Square
              cMark={this.props.cSquares[i]}
              qMarks={this.props.qSquares[i]}
              onClick={() => this.props.onSquareClick(i)}
              isHighlighted={this.props.cycleSquares && this.props.cycleSquares.has(i)}
              isBeingCollapsed={this.props.collapseSquare === i}
              cycleMarks={this.props.cycleMarks}
           />;
  }

  render() {

    return (
      <div>
        <div className="board-row">
          {this.renderSquare(0)}
          {this.renderSquare(1)}
          {this.renderSquare(2)}
        </div>
        <div className="board-row">
          {this.renderSquare(3)}
          {this.renderSquare(4)}
          {this.renderSquare(5)}
        </div>
        <div className="board-row">
          {this.renderSquare(6)}
          {this.renderSquare(7)}
          {this.renderSquare(8)}
        </div>
      </div>
    );
  }
}

function SideBar(props){
  let choices;

  if (props.choices)
    choices = props.choices.map((choice) => {
        return (
          <div className="collapseChoice"
             onClick={() => props.onChoiceClick(choice)}
             key={choice}>
             {choice}
          </div>
        );
      });

  return (<div className="game-info">
            <div className="status"> {props.status} </div>
            {choices}
          </div>);
}

class Game extends React.Component {
  constructor(){
    super();

    this.state = {
      cSquares: Array(9).fill(null), // classical squares
      qSquares: Array(9).fill(null), // quantum squares
      xIsNext: true,
      turnNum: 1,
      subTurnNum: 0,
      cycleSquares: null,
      cycleMarks: null,
      collapseSquare: null,
      gameOver: false,
      xScore: 0,
      yScore: 0,
    }
  }

  whoseTurn(){
    return (this.state.subTurnNum < 2) ? 'X' : 'Y';
  }

  isSecondMove(){
    return this.state.subTurnNum === 1 || this.state.subTurnNum === 3;
  }

  handleSquareClick(i){

    if (this.state.cycleSquares)
      this.handleCyclicEntanglement(i);

    else if (this.state.gameOver)
      this.setState({status: "This game is already over! Start a new game!!"});

    else if (this.state.cSquares[i])
      this.setState({status: "This square already has a classical mark! No more quantum marks can go here >:("});

    else if (this.state.subTurnNum % 2 // second move
        && this.state.lastMove === i)
      this.setState({status: "Can't move twice in the same square! \n What do you think this is... regular tic tac toe??"});

    else
      this.handleNormalMove(i);
  }

  handleNormalMove(i){
    let qSquares = this.state.qSquares;
    let marker = this.whoseTurn() + this.state.turnNum;

    if (qSquares[i])
      qSquares[i].push(marker);
    else
      qSquares[i] = [marker];

    if (! g.hasNode(i))
      g.addNode(i);
    if (this.isSecondMove())
      g.addEdge(this.state.lastMove, i, marker);

    let cycleSquares, cycleMarks, status;

    if (g.isCyclic(i)){
      [cycleSquares, cycleMarks] = g.getCycle(i);

      let whoDecidesCollapse = this.whoseTurn() === 'X' ? 'Y' : 'X' // opposite of who made cycle
      status = `A loop of entanglement has occured! Player ${whoDecidesCollapse} will decide which of the possible states the board will collapse into. Click one of the squares involved in the loop.`;
    }

    this.setState((state, props) => ({
                   qSquares: qSquares,
                   turnNum: (state.subTurnNum + 1 === 4)
                              ? state.turnNum + 1
                              : state.turnNum,
                   subTurnNum: (state.subTurnNum + 1) % 4,
                   lastMove: i,
                   cycleSquares: cycleSquares,
                   cycleMarks: cycleMarks,
                   status: status,
                 }));

  }

  handleCyclicEntanglement(i){

    if (! this.state.cycleSquares.has(i))
      return

    let whoDecidesCollapse = this.whoseTurn() === 'X' ? 'Y' : 'X' // opposite of who made cycle
    let status = `Now, player ${whoDecidesCollapse}: choose below which state you want to occupy the selected square.`

    this.setState({
                  collapseSquare: i,
                  status: status,
                });
  }

  handleCollapse(mark){
    console.log(mark);
    let i = this.state.collapseSquare;
    let visited = new Set([mark]);

    this._handleCollapseHelper(mark, i, visited)

    let scores = this.calculateScores();

    if (scores){
      let msg = this.setScoreMsg(scores);

      this.setState({
        gameOver: true,
        xScore: this.state.xScore + scores['X'],
        yScore: this.state.yScore + scores['Y'],
        status: msg,
      })
    }

    this.setState({
      cycleSquares: null,
      cycleMarks: null,
      collapseSquare: null,
    });

  }

  _handleCollapseHelper(mark, i, visited){
    let cSquares = this.state.cSquares;
    let qSquares = this.state.qSquares;
    cSquares[i] = mark;
    qSquares[i] = null;

    this.setState( {
      cSquares: cSquares,
      qSquares: qSquares
    });

    for (let edge of g.getNode(i).edges){
      if (! visited.has(edge.key)){
        visited.add(edge.key);
        this._handleCollapseHelper(edge.key, edge.end.id, visited);
      }
    }
  }

  getWinnerMsg(scores){
    let msg;
    let winner = scores['X'] > scores['Y'] ? 'X' : 'Y';
    let loser = winner === 'X' ? 'Y' : 'X';

    if (scores['X'] + scores['Y'] === 1)
      msg = `${winner} wins!!! \n ${winner} gets 1 point \n ${loser} gets 0 points`;

    else if (scores['X'] === 1.5 || scores['Y'] === 1.5)
      msg = `${winner} wins with a double three-in-a-row!!! \n ${winner} gets 1.5 points \n ${loser} gets 0 points`;

    else if (scores['X'] + scores['Y'] === 1.5)
      msg = `Both players got three in a row, but ${winner} got it first! (The mark placed in${winner}'s three-in-a-row has a smaller subscript than ${loser} \n ${winner} gets 1 point \n ${loser} gets 0.5 points`;

    return msg;
  }

  calculateWinners(){
    const squares = this.state.cSquares;
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    let winners = [];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[b] && squares[c] &&
          squares[a][0] === squares[b][0] &&
          squares[a][0] === squares[c][0]) {

        let subscripts = [squares[a][1], squares[b][1], squares[c][1]].map(Number);

        winners.push( [
                        Math.max(...subscripts),
                        squares[a][0],
                        lines[i],
                      ]
                    ) ;
      }
    }

    return winners;
  }

  calculateScores() {
    let winners = this.calculateWinners();

    if (winners.length === 0)
      return null

    winners.sort();
    let scores = {'X': 0, 'Y': 0}

    if (winners.length >= 1)
      scores[ winners[0][1] ] += 1;
    else if (winners.length >= 2)
      scores[ winners[1][1] ] += 0.5;
    else if (winners.length === 3)
      scores[ winners[2][1] ] += 0.5;

    return scores;
  }

  render() {
    let status, choices;

    if (this.state.status)
      status = this.state.status;
    else
      status = `Player ${this.whoseTurn()} is next!`;

    if(this.state.collapseSquare)
      choices = this.state.qSquares[ this.state.collapseSquare ]
        .filter((choice) => this.state.cycleMarks.has(choice) )

    return (
      <div>
        <center> <h1> Quantum Tic Tac Toe </h1> </center>
        <div className="game">
          <div className="game-board">

              <Board
                cSquares={this.state.cSquares}
                qSquares={this.state.qSquares}
                cycleSquares={this.state.cycleSquares}
                cycleMarks={this.state.cycleMarks}
                collapseSquare={this.state.collapseSquare}
                onSquareClick={(i) => this.handleSquareClick(i)}
              />

              <div className="xScore"> X: {this.state.xScore} </div>
              <div className="yScore"> Y: {this.state.yScore} </div>
          </div>

            <SideBar
              status={status}
              choices={choices}
              onChoiceClick={(choice) => this.handleCollapse(choice)}
             />

        </div>
      </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
);

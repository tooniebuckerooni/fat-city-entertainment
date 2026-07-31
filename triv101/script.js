"use strict";

var questions = (window.TRIV101 ? window.TRIV101.getQuestions() : []);
"use strict";

var buttons = 20;
var numbers = [3, 17, 2, 15, 10, 6, 13, 4, 18, 1, 20, 5, 12, 9, 14, 11, 8, 16, 7, 19];
var answered = Array.from({
  length: buttons
}, function (v) {
  return false;
});
var mode = "option1";
var startingScoreNumber = 101;
var teams = [];
var turn = 0;
"use strict";

var newTeam = document.querySelector("#new-team");
var startingScore = document.querySelector("#starting-score");
var gameOptions = document.querySelector(".game-options");
var container = document.querySelector(".container");
var gameContainer = document.querySelector(".game-container");
var sideContent = document.querySelector(".side-content");
var teamStatsContainer = document.querySelector(".team-stats-container");
var teamStats = [];
var temp = [];
var infinite = true;
var exact = false;

var addTeam = function addTeam() {
  var teams = document.querySelector(".game-options-teams");
  var hash = md5(newTeam.value);

  if (temp.includes(newTeam.value)) {
    openModal("\n      <div class=\"default-modal-container\">\n        <p>".concat(newTeam.value, " team already exists! Please chose another name.</p>\n        <button class=\"button error-bg\" style=\"margin: 0\" onclick=\"closeModal()\">Close</button>\n      </div>\n    "));
  } else {
    teams.insertAdjacentHTML("beforeend", "\n      <div class=\"team-name\" id=".concat(hash, ">\n        <p>").concat(newTeam.value, "</p>\n        <img class=\"icon-button\" src=\"assets/x.svg\" onclick=\"deleteTeam(event)\" />\n      </div>\n    "));
    temp.push(newTeam.value);
    newTeam.value = "";
  }
};

newTeam.addEventListener("keydown", function (event) {
  if (event.keyCode == 13) addTeam();
});

var deleteTeam = function deleteTeam(event) {
  // console.log(event);
  temp = temp.filter(function (value) {
    return event.target.parentElement.id != md5(value);
  });
  event.target.parentElement.remove();
};

var genTeams = function genTeams() {
  teams.forEach(function (team, index) {
    teamStatsContainer.insertAdjacentHTML("beforeend", "\n      <div class=\"team-stats\" id=\"team-".concat(index, "\">\n        <p>").concat(team.name, "</p>\n        <p id=\"team-").concat(index, "-score\">").concat(team.score, "</p>\n      </div>\n    "));
  });
};

var initTurn = function initTurn() {
  teamStats = document.querySelectorAll(".team-stats");
  teamStats[turn].style.color = "#46c93a";
};

var toggleInfinite = function toggleInfinite() {
  return infinite = !infinite;
};

var toggleExact = function toggleExact() {
  return exact = !exact;
};

var startGame = function startGame() {
  if (temp.length < 2) {
    openModal("\n      <div class=\"default-modal-container\">\n        <p>You need at least 2 teams in order to play.</p>\n        <button class=\"button error-bg\" style=\"margin: 0\" onclick=\"closeModal()\">Close</button>\n      </div>\n    ");
  } else if (temp.length >= 24) {
    openModal("\n      <div class=\"default-modal-container\">\n        <p>The game can only have up to 24 teams.</p>\n        <button class=\"button error-bg\" style=\"margin: 0\" onclick=\"closeModal()\">Close</button>\n      </div>\n    ");
  } else {
    gameOptions.style.display = "none";
    sideContent.style.display = "flex";
    gameContainer.style.display = "flex";
    container.style.backgroundImage = "url('assets/bg-blurred.jpg')";
    startingScoreNumber = parseInt(startingScore.value);
    temp.forEach(function (team) {
      return teams.push({
        name: team,
        score: startingScoreNumber
      });
    });
    genTeams();
    initTurn();
    themeAudio.currentTime = 0;
    themeAudio.play();
  }
}; // startGame();


var goFullScreen = function goFullScreen() {
  var body = document.querySelector("body");
  body.requestFullscreen();
};
"use strict";

var center = document.querySelector("#center");
var wrongAudio = new Audio("assets/audio/wrong.mp3");
var throwAudio = new Audio("assets/audio/throwdart.mp3");
var coinAudio = new Audio("assets/audio/coin.wav");
var themeAudio = new Audio("assets/audio/themesong.mp3");
var winAudio = new Audio("assets/audio/win.wav");
var currentIndex = 0;
var currentNumber = 0;

var nextTurn = function nextTurn() {
  evaluateWinner();
  teamStats[turn].style.color = "#fff";

  if (turn >= teams.length - 1) {
    turn = 0;
  } else {
    turn++;
  }

  teamStats[turn].style.color = "#46c93a";
};

var genWinModal = function genWinModal(index) {
  return "\n  <div class=\"default-modal-container\">\n    <p style=\"font-size: 2.5em; margin-top: 0\">Team ".concat(teams[index].name, " won!</p>\n    <div>\n      <button class=\"button success-bg\" style=\"margin: 0\" onclick=\"playAgain()\">Play again</button>\n      <button class=\"button success-bg\" style=\"margin: 0\" onclick=\"restartGame()\">Restart game</button>\n    </div>\n  </div>\n");
};

var evaluateFail = function evaluateFail() {
  var _totalAnswered = 0;

  for (var i = 0; i < answered.length; i++) {
    if (answered[i]) {
      _totalAnswered++;
    }
  }

  if (_totalAnswered === buttons && !infinite) {
    openModal("\n      <div class=\"default-modal-container\">\n        <p style=\"font-size: 2.5em; margin-top: 0\">Fail! There are no questions left!</p>\n        <div>\n          <button class=\"button success-bg\" style=\"margin: 0\" onclick=\"playAgain()\">Play again</button>\n          <button class=\"button success-bg\" style=\"margin: 0\" onclick=\"restartGame()\">Restart game</button>\n        </div>\n      </div>\n    ");
  }
};

var evaluateWinner = function evaluateWinner() {
  var _won = false;

  for (var i = 0; i < teams.length; i++) {
    if (teams[i].score === 0) {
      openModal(genWinModal(i));
      themeAudio.pause();
      winAudio.currentTime = 0;
      winAudio.play();
      _won = true;
      break;
    } // if (teams[i].score < 1) {
    //   openModal(genWinModal(i));
    //   _won = true;
    //   break;
    // }

  }

  if (!_won) {
    closeModal();
  }

  setTimeout(evaluateFail, 1000);
};

var genButtons = function genButtons() {
  var buttonSize = 9;

  for (var i = 0; i < buttons; i++) {
    var theta = 360 / buttons / 180 * i * Math.PI;
    var x = "calc(".concat(39 * Math.cos(theta), "vh - ").concat(buttonSize / 2, "vh)");
    var y = "calc(".concat(39 * Math.sin(theta), "vh - ").concat(buttonSize / 2, "vh)");
    center.insertAdjacentHTML("beforeend", "\n      <div class=\"game-button\" id=\"".concat(i, "-btn\" onclick=\"press(").concat(i, ")\" style=\"\n        top: ").concat(x, ";\n        left: ").concat(y, ";\n      \">\n        <p>").concat(numbers[i], "</p>\n      </div>\n    "));
  }
};

genButtons();

var playAgain = function playAgain() {
  answered = Array.from({
    length: buttons
  }, function (v) {
    return false;
  });
  turn = 0;
  teams = teams.map(function (team) {
    return {
      name: team.name,
      score: startingScoreNumber
    };
  });

  for (var i = 0; i < teams.length; i++) {
    var _teamStat = document.querySelector("#team-".concat(i, "-score"));

    _teamStat.innerHTML = startingScoreNumber;
  }

  var gameButtons = document.querySelectorAll(".game-button");
  gameButtons.forEach(function (button) {
    return button.classList.remove("used");
  });
  teamStats.forEach(function (teamStat) {
    return teamStat.style.color = "#fff";
  });
  teamStats[0].style.color = "#46c93a";
  closeModal();
  themeAudio.currentTime = 0;
  themeAudio.play();
};

var restartGame = function restartGame() {
  location.reload();
};

var bindAction = function bindAction() {
  var answers = document.querySelectorAll(".answer");
  var reveals = document.querySelectorAll(".reveal");
  var takePoints = document.querySelector("#take-points");
  var wrongAnswer = document.querySelector("#wrong-answer");
  var correctAnswers = 0;
  reveals[0].addEventListener("click", function (event) {
    answers[0].classList.remove("hidden-answer");
    reveals[0].classList.add("hidden-option");
    reveals[1].classList.remove("hidden-option");
    takePoints.classList.remove("hidden-option");
    wrongAnswer.classList.remove("hidden-option");
  });
  reveals[1].addEventListener("click", function (event) {
    correctAnswers++;
    answers[1].classList.remove("hidden-answer");
    reveals[1].classList.add("hidden-option");
    reveals[2].classList.remove("hidden-option");
    takePoints.classList.remove("hidden-option");
    wrongAnswer.classList.remove("hidden-option");
  });
  reveals[2].addEventListener("click", function (event) {
    correctAnswers++;
    answers[2].classList.remove("hidden-answer");
    reveals[2].classList.add("hidden-option");
    takePoints.classList.remove("hidden-option");
    wrongAnswer.classList.remove("hidden-option");
  });
  takePoints.addEventListener("click", function (event) {
    coinAudio.play();

    var _score = (correctAnswers + 1) * currentNumber;

    var teamScore = document.querySelector("#team-".concat(turn, "-score"));

    if (teams[turn].score - _score >= 0) {
      teams[turn].score -= _score;
      teamScore.innerHTML = teams[turn].score;
    }

    if (!infinite) {
      var el = document.getElementById("".concat(currentIndex, "-btn"));
      el.classList.add("used");
      answered[currentIndex] = true;
    }

    nextTurn();
  });
  wrongAnswer.addEventListener("click", function (event) {
    wrongAudio.play();

    if (!infinite) {
      var el = document.getElementById("".concat(currentIndex, "-btn"));
      el.classList.add("used");
      answered[currentIndex] = true;
    }

    nextTurn();
  });
};

var press = function press(index) {
  currentIndex = index;
  currentNumber = numbers[index];

  if (infinite || !answered[index]) {
    throwAudio.currentTime = 0;
    throwAudio.play();
    var pool = (window.TRIV101 ? window.TRIV101.getQuestions() : questions);
    var question = pool[Math.floor(Math.random() * pool.length)];
    openModal("\n      <div class=\"default-modal-container\">\n        <p style=\"margin-top: 0; margin-bottom: 8px; font-size: 1.8em\">".concat(question.question, "</p>\n  \n        <div class=\"answer-container\">\n          <p style=\"font-size: 1.3em; margin: 2px\">1. </p>\n          <p class=\"answer hidden-answer\" style=\"margin: 2px; font-size: 1.3em\">").concat(question.answers[0], "</p>\n          <p class=\"points\" style=\"margin: 2px; font-size: 1.3em\">").concat(numbers[index], " points</p>\n        </div>\n        <div class=\"answer-container\">\n          <p style=\"font-size: 1.3em; margin: 2px\">2. </p>\n          <p class=\"answer hidden-answer\" style=\"margin: 2px; font-size: 1.3em\">").concat(question.answers[1], "</p>\n          <p class=\"points\" style=\"margin: 2px; font-size: 1.3em\">").concat(numbers[index] * 2, " points</p>\n        </div>\n        <div class=\"answer-container\" style=\"margin-bottom: 16px\">\n          <p style=\"font-size: 1.3em; margin: 2px\">3. </p>\n          <p class=\"answer hidden-answer\" style=\"margin: 2px; font-size: 1.3em\">").concat(question.answers[2], "</p>\n          <p class=\"points\" style=\"margin: 2px; font-size: 1.3em\">").concat(numbers[index] * 3, " points</p>\n        </div>\n  \n        <div>\n          <button class=\"reveal button success-bg\" style=\"margin: 0\">Reveal first answer</button>\n          <button class=\"reveal button success-bg hidden-option\" style=\"margin: 0\">Reveal second answer</button>\n          <button class=\"reveal button success-bg hidden-option\" style=\"margin: 0\">Reveal third answer</button>\n          <button id=\"take-points\" class=\"button warning-bg hidden-option\" style=\"margin: 0\">Take points</button>\n          <button id=\"wrong-answer\" class=\"button error-bg hidden-option\" style=\"margin: 0\">Wrong answer</button>\n        </div>\n      </div>\n    "), {
      full: true
    });
    bindAction();
  } // el.classList.add("used");
  // if (!answered[index]) {
  //   console.log(el);
  //   answered[index] = true;
  // }


  console.log(numbers[index]);
  console.log("Infinite: ".concat(infinite, " | Exact: ").concat(exact));
};
"use strict";

var modal = document.querySelector(".modal");
var modalContent = document.querySelector(".modal-content");

var openModal = function openModal(renderString) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    full: false
  };
  modal.style.display = "flex";
  setTimeout(function () {
    modalContent.classList.remove("modal-closing");
    modalContent.classList.add("modal-opening");
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
  }, 200);

  if (renderString) {
    modalContent.innerHTML = renderString;
  }

  if (options.full) {
    modalContent.classList.add("full-modal");
  }
};

var closeModal = function closeModal() {
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.0)";
  setTimeout(function () {
    modal.style.display = "none";
    modalContent.innerHTML = "\n      <div class=\"default-modal-container\">\n        <p>Hello, this is a modal!</p>\n        <button class=\"button error-bg\" style=\"margin: 0\" onclick=\"closeModal()\">Close</button>\n      </div>\n    ";
    modalContent.classList.remove(["full-modal"]);
  }, 500);
  modalContent.classList.add("modal-closing");
  modalContent.classList.remove("modal-opening");
}; // window.onclick = (event) => {
//   if (event.target == modal) {
//     closeModal();
//   }
// }


var changeModal = function changeModal(renderString) {
  modalContent.innerHTML = renderString;
};
"use strict";

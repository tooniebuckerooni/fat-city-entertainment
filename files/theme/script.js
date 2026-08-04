// Email-capture gate, shown before the PDF actually builds. The "Download
// PDF" button now opens this instead of calling generateCards() directly;
// both submitting an email and skipping lead to the same generateCards()
// call below, unchanged from before this gate existed. Never blocks the
// download on the network call succeeding — losing the free-tool goodwill
// that built this audience isn't worth a few more captured emails.
var FCE_SUBSCRIBE_ENDPOINT = "https://triv101-api.dustinramsbottom.workers.dev/api/subscribe";

function generate() {
	document.getElementById("fce-gate-overlay").classList.add("fce-gate-open");
}

function fceGateClose() {
	document.getElementById("fce-gate-overlay").classList.remove("fce-gate-open");
}

function fceGateSkip() {
	fceGateClose();
	generateCards();
}

function fceGateSubmit() {
	var emailInput = document.getElementById("fce-gate-email");
	var errorEl = document.getElementById("fce-gate-error");
	var email = emailInput.value.trim();
	var isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	if (!isValid) {
		errorEl.style.display = "block";
		return;
	}
	errorEl.style.display = "none";
	var btn = document.getElementById("fce-gate-submit");
	btn.disabled = true;
	btn.textContent = "Sending...";
	fetch(FCE_SUBSCRIBE_ENDPOINT, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ email: email, source: "bingocardgenerator" })
	}).catch(function () {
		// Non-fatal — the download proceeds either way, see note above.
	}).finally(function () {
		btn.disabled = false;
		btn.textContent = "Get My Cards";
		fceGateClose();
		generateCards();
	});
}

document.addEventListener("DOMContentLoaded", function () {
	var submitBtn = document.getElementById("fce-gate-submit");
	var skipBtn = document.getElementById("fce-gate-skip");
	var emailInput = document.getElementById("fce-gate-email");
	if (submitBtn) submitBtn.addEventListener("click", fceGateSubmit);
	if (skipBtn) skipBtn.addEventListener("click", fceGateSkip);
	if (emailInput) emailInput.addEventListener("keydown", function (e) {
		if (e.key === "Enter") fceGateSubmit();
	});
});

function generateCards() {
	var doc = new jsPDF({
	  orientation: 'landscape',
	  unit: 'mm',
	  format: "letter"
	});

	// 8.5 by 11 inches (215.9 by 279.4 mm)
	// 1/2 width = 139.7

	var cardTitle = document.querySelector("#card-title");
	var words = document.querySelector("#words");

	var freeSpace = document.querySelector("#free-space");
	var freeSpaceTitle = document.querySelector("#free-space-title");
	var freeSpaceDescription = document.querySelector("#free-space-description");
	var freeSpacePlacement = document.querySelector("#free-space-placement");

	// var squaresX = document.querySelector("#squares-wide");
	// var squaresY = document.querySelector("#squares-tall");

	var cardsAmount = document.querySelector("#cards-amount");

	var randomIndecies = [];

	function generateRandomWordList(tPos) {
		var randomWords = [];
		function shuffle(a) {
		    var j, x, i;
		    for (i = a.length - 1; i > 0; i--) {
		        j = Math.floor(Math.random() * (i + 1));
		        x = a[i];
		        a[i] = a[j];
		        a[j] = x;
		    }
		    return a;
		}
		var buffer = shuffle(words.value.split(","));
		// console.log(buffer);
		for (var i = 0; i < 25; i++) {
			// var randomIndex = Math.floor(Math.random() * words.value.split(",").length);
			randomWords.push(buffer[i]);
		}
		var pos = [
			[8, 40],  [34, 40],  [60, 40],  [86, 40],  [112, 40], // first row
			[8, 64],  [34, 64],  [60, 64],  [86, 64],  [112, 64],
			[8, 88],  [34, 88],  [60, 88],  [86, 88],  [112, 88],
			[8, 112], [34, 112], [60, 112], [86, 112], [112, 112],
			[8, 136], [34, 136], [60, 136], [86, 136], [112, 136] // last row
		];
		if (freeSpace.value == "yes") {
			if (freeSpacePlacement.value == "center") {
				randomWords[12] = {content: freeSpaceTitle.value, styles: {fontStyle: "bold", fontSize: 13}};
				doc.setFontSize(11);
				doc.setTextColor(90, 90, 90);
				doc.text("Free Space", 60, 88);
				doc.text("Free Space", 199.7, 88);
				// doc.text("Free Space", 8, 40);
			} else if (freeSpacePlacement.value == "random") {
				var randomIndex = Math.floor(Math.random() * 25);
				// var randomIndex = 3;
				randomWords[randomIndex] = {content: freeSpaceTitle.value, styles: {fontStyle: "bold", fontSize: 13}};
				randomIndecies.push(randomIndex);
			}
		}
		return randomWords;
	}

	function formatArray(arr) {
		var mainBuffer = [];
		var buffer = [];
		var count = 0;
		for (var i = 0; i < 5; i++) {
			for (var j = 0; j < 5; j++) {
				buffer.push(arr[count]);
				count++;
			}
			mainBuffer.push(buffer);
			buffer = [];
		}
		return mainBuffer;
	}

	// console.log(formatArray(generateRandomWordList()));

	function generateTable(pos, title, bodyWords) {
		var setMargin;
		var textPos;
		if (pos == "left") {
			setMargin = {top: 5, left: 5, right: 144.7};
			textPos = [10, 147];
		} else {
			setMargin = {top: 5, left: 144.7, right: 5};
			textPos = [150, 147];
		}
		doc.autoTable({
		    theme: "grid",
			bodyStyles: {lineWidth: 0.33, cellWidth: 23.94, lineColor: "#000", fillColor: "#fff", minCellHeight: 23.94, halign: 'center', valign: 'middle', fontSize: 11, overflow: "linebreak"},
		    head: [[{content: title, colSpan: 5, rowSpan: 1, styles: {minCellHeight: 12, lineWidth: 0.33, lineColor: "#000", halign: 'center', valign: 'middle', fontSize: 22, fillColor: "#000", textColor: "#fff", overflow: "linebreak"}}]],
		    body: bodyWords,
		    margin: setMargin,
		    startY: 5,
		    avoidPageSplit: true,
		});
		doc.setFontSize(16);
		doc.setTextColor(0, 0, 0);
		doc.text("Find More Games At FatCityEntertainment.com", textPos[0], textPos[1]);
	}

	function generatePage(title, tableData, tableCount, first = false) {
		if (!first) {
			doc.addPage();
		}
		generateTable("left", title, tableData[0]);
		doc.line(139.7, 0, 139.7, 215.9);
		if (tableCount == 2) {
			generateTable("right", title, tableData[1]);
		}
	}

	function generateAllPages() {
		for (var i = 0; i < Math.round(Number(cardsAmount.value / 2)); i++) {
			tableData = [];
			tableData.push(formatArray(generateRandomWordList("left")));
			tableData.push(formatArray(generateRandomWordList()));
			var tableCount = 2;
			if (i == Math.round(Number(cardsAmount.value / 2)) - 1) {
				if (cardsAmount.value % 2 == 1) {
					tableCount = 1;
				}
			}
			generatePage(cardTitle.value, tableData, tableCount, i == 0 ? true : false);
		}
	}

	generateAllPages();

	// console.log(randomIndecies);

	var pos = [
		[8, 40],  [34, 40],  [60, 40],  [86, 40],  [112, 40], // first row
		[8, 64],  [34, 64],  [60, 64],  [86, 64],  [112, 64],
		[8, 88],  [34, 88],  [60, 88],  [86, 88],  [112, 88],
		[8, 112], [34, 112], [60, 112], [86, 112], [112, 112],
		[8, 136], [34, 136], [60, 136], [86, 136], [112, 136] // last row
	];

	var currentPage = 1;

	for (var i = 0; i < randomIndecies.length; i++) {
		doc.setPage(currentPage);
		if (i % 2 == 0) {
			doc.setFontSize(11);
			doc.setTextColor(90, 90, 90);
			doc.text("Free Space", pos[randomIndecies[i]][0], pos[randomIndecies[i]][1]);
			// console.log(randomIndecies[i]);
		} else {
			doc.setFontSize(11);
			doc.setTextColor(90, 90, 90);
			doc.text("Free Space", pos[randomIndecies[i]][0] + 139.7, pos[randomIndecies[i]][1]);
			// console.log(randomIndecies[i]);
			currentPage++;
		}
	}

	// console.log(cardTitle.value);
	doc.save(cardsAmount.value + "-bingo-cards.pdf");
	// location.reload();
}
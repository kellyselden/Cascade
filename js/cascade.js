Array.prototype.remove = function() {
	var count = 0;
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		if (arg.constructor == Array) {
			for (var j = 0; j < arg.length; j++)
				count += this.remove(arg[j]);
		} else {
			var index = 0;
			while (index < this.length) {
				if (this[index] == arg) {
					var end = this.slice(index + 1);
					this.length = index;
					this.push.apply(this, end);
					count++;
				} else index++;
			}
		}
	}
	return count;
};
Array.prototype.peek = function() {
    return this.length > 0 ? this[this.length - 1] : undefined;
};
Array.prototype.contains = function(el) {
    return this.indexOf(el) > -1;
};

$(function() {
	var rowsInput = $('#rows');
	var colsInput = $('#cols');
	var defaultColors = $('#defaultColors');
	var randomColors = $('#randomColors');
	var specifyColors = $('#specifyColors');
	var generateButton = $('#generate');
	$('[name="colors"]').change(function() {
		$('#specifyColorsDiv').toggle(specifyColors.attr('checked') == 'checked');
	});
	generateButton.click(function() {
		generate(
			parseInt(rowsInput.val()),
			parseInt(colsInput.val()),
			defaultColors.attr('checked') == 'checked' ? null
				: randomColors.attr('checked') == 'checked' ? -1
				: parseInt($('#numOfColors').val())
		);
	});
	rowsInput.val(4);
	colsInput.val(4);
	defaultColors.click();
	generateButton.click();
});

function generate(rowCount, colCount, numOfColors) {
	var gridDiv = $('#grid').empty();
	var gridHeight = gridDiv.height();
	var gridWidth = gridDiv.width();
	
	var cellCount = rowCount * colCount;
	
	var cellHeight = (gridHeight - rowCount - 1) / rowCount;
	var cellWidth = (gridWidth - colCount - 1) / colCount;
	var cellSize = Math.min(cellHeight, cellWidth);
	
	var cells = [];
	var emptyCells = [];
	var gridArray = [];
	for (var row = 0; row < rowCount; row++) {
		var rowDiv = $('<div class="row"></div>');
		for (var col = 0; col < colCount; col++) {
			var cellDiv = $('<div class="cell"></div>');
			cellDiv.height(cellSize).width(cellSize);
			rowDiv.append(cellDiv);
			
			var cell = new Cell(row, col);
			cells.push(cell);
			emptyCells.push(cell);
		}
		gridDiv.append(rowDiv);
		
		gridArray[row] = [];
	}
	
	var circleMidpoint = cellSize / 2;
	var circleRadius = cellSize / 4;
	numOfColors = numOfColors || Math.min(rowCount, colCount);
	var randFunc = function() { return 0.5 - Math.random() };
	var seed = Math.random().toString().substr(2);
	//seed = '27878770721144974';
	Math.seedrandom(seed);
	console.log(seed);
	var circles = [];
	
	function canCellAcceptSrcCircle(srcCell) {
		return true;
	}
	function canCellAcceptDstCircle(dstCell, srcCell) {
		if (srcCell.row == dstCell.row - 1 && srcCell.col == dstCell.col ||
			srcCell.row == dstCell.row && srcCell.col == dstCell.col + 1 ||
			srcCell.row == dstCell.row + 1 && srcCell.col == dstCell.col ||
			srcCell.row == dstCell.row && srcCell.col == dstCell.col - 1)
			return false;
		return true;
	}
	
	function getBorderCount(cell) {
		var borderCount = 0;
		if (cell.row == 0) borderCount++;
		if (cell.col == 0) borderCount++;
		if (cell.row == rowCount - 1) borderCount++;
		if (cell.col == colCount - 1) borderCount++;
		return borderCount;
	}
	function getObstacleCount(cell) {
		var obstacleCount = getBorderCount(cell);
		var nextCells = getAdjacentCells(cell);
		for (var i = 0; i < nextCells.length; i++)
			if (getObject(nextCells[i]))
				obstacleCount++;
		return obstacleCount;
	}
	
	//don't create dead ends
	function isRequiredEndpoint(cell) {
		return getObstacleCount(cell) == 3;
	}
	
	function placeCircle(cell, colorIndex) {
		var circle = new Circle(cell, colorIndex);
		setObject(cell, circle);
		circles.push(circle);
		return circle;
	}	
	function hasPlacementBeenTried(circlePlacement, colorIndex) {
		var circlePlacements = historicCirclePlacement[colorIndex];
		for (var i = 0; i < circlePlacements.length; i++) {
			var cp = circlePlacements[i];
			if ((cp.srcCell == circlePlacement.srcCell &&
				cp.dstCell == circlePlacement.dstCell) ||
				(cp.dstCell == circlePlacement.srcCell &&
				cp.srcCell == circlePlacement.dstCell))
				return true;
		}
		return false;
	}	
	function placeCirclesByRound(firstCollection, secondCollection, colorIndex) {
		var circlePlacements = historicCirclePlacement[colorIndex];
		var secondCollectionSource = secondCollection;
		for (var i = 0; i < firstCollection.length; i++) {
			var srcCell = firstCollection[i];
			if (canCellAcceptSrcCircle(srcCell)) {
				secondCollection = secondCollectionSource.slice(0);
				secondCollection.remove(srcCell);
				for (var j = 0; j < secondCollection.length; j++) {
					var dstCell = secondCollection[j];
					var circlePlacement = new CirclePlacement(srcCell, dstCell);
					if (hasPlacementBeenTried(circlePlacement, colorIndex))
						continue;
					if (canCellAcceptDstCircle(dstCell, srcCell)) {
						var srcCircle = placeCircle(srcCell, colorIndex);
						var dstCircle = placeCircle(dstCell, colorIndex);
						drawCircle(srcCircle);
						drawCircle(dstCircle);
						circlePlacements.push(circlePlacement);
						return { srcCircle: srcCircle, dstCircle: dstCircle };
					}
				}
			}
		}
		return undefined;
	}
	
	function placeCircles(colorIndex) {
		emptyCells.sort(randFunc);
		
		var emptyRequiredCells = getEmptyRequiredCells();
		var retVal = placeCirclesByRound(emptyRequiredCells, emptyRequiredCells.length == 1
			? emptyCells : emptyRequiredCells, colorIndex);
		if (retVal) return retVal;
		
		var emptyNonRequiredCells = emptyCells.slice(0);
		emptyNonRequiredCells.remove(emptyRequiredCells);
		var retVal = placeCirclesByRound(emptyNonRequiredCells, emptyNonRequiredCells, colorIndex);
		if (retVal) return retVal;
		
		return undefined;
	}
	
	function getCellDiv(cell) {
		return gridDiv.children().eq(cell.row).children().eq(cell.col);
	}
	function drawCircle(circle) {
		getCellDiv(circle.cell).append(
			'<svg class="circle" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
				'<circle ' +
					'cx="' + circleMidpoint + '" ' +
					'cy="' + circleMidpoint + '" ' +
					'r="' + circleRadius + '" ' +
					'colorIndex="' + circle.colorIndex + '" ' +
					'fill="white" ' +
				'/>' +
			'</svg>'
		);
	}
	function deleteCircle(circle) {
		getCellDiv(circle.cell).find('.circle').remove();
	}
	function drawDirection(thisCell, nextCell, colorIndex) {
		var thisCellDiv = getCellDiv(thisCell);
		var nextCellDiv = getCellDiv(nextCell);
		var thisCellOffset = thisCellDiv.offset();
		var nextCellOffset = nextCellDiv.offset();
		var y = nextCellOffset.top - thisCellOffset.top;
		var x = nextCellOffset.left - thisCellOffset.left;
		thisCellDiv.append(
			$('<div class="link"></div>')
				.attr('colorIndex', colorIndex)
				.css('background-color', 'white')
				.height(Math.max(Math.abs(y), 1))
				.width(Math.max(Math.abs(x), 1))
				.offset({
					top: y / 2 || circleMidpoint,
					left: x / 2 || circleMidpoint
				})
		);
	}
	function deleteDirection(thisCell) {
		getCellDiv(thisCell).find('.link').remove();
	}
	
	//not used
	function isBorderCell(cell) {
		return cell.row == 0 || cell.row == rowCount - 1 ||
			cell.col == 0 || cell.col == colCount - 1;
	}
	
	function getCell(row, col) {
		for (var i = 0; i < cells.length; i++) {
			var cell = cells[i];
			if (cell.row == row && cell.col == col)
				return cell;
		}
	}
	function getNextCell(cell, direction) {
		return getCell(cell.row + direction.y, cell.col + direction.x);
	}
	
	function getObject(cell) {
		return gridArray[cell.row][cell.col];
	}
	function setObject(cell, obj) {
		gridArray[cell.row][cell.col] = obj;
		if (obj) emptyCells.remove(cell);
		else emptyCells.push(cell);
	}
	
	//might need to gut this if it isn't going to be used dual-function
	function createDirectionsArray() {
		var directions = [];
		directions.push(new Direction(0, -1));
		directions.push(new Direction(1, 0));
		directions.push(new Direction(0, 1));
		directions.push(new Direction(-1, 0));
		return directions;
	}
	//use for speed
	var reuseableDirections = createDirectionsArray();
	function sortDirectionsArray(directions) {
		directions.sort(randFunc);
	}
	//use if you need to maintain a copy during recursion
	function createRandomDirectionsArray() {
		var directions = createDirectionsArray();
		sortDirectionsArray(directions);
		return directions;
	}
	
	function checkForRequiredDirection(cell) {
		return getBorderCount(cell) == 2;
	}
	
	function getAdjacentObjects(cell) {
		var nextCells = getAdjacentCells(cell, true);
		var objects = [];
		for (var i = 0; i < nextCells.length; i++) {
			var obj = getObject(nextCells[i]);
			if (obj) objects.push(obj);
		}
		return objects;
	}
	function getAdjacentEmptyCells(cell) {
		var nextCells = getAdjacentCells(cell, true);
		var adjacentEmptyCells = [];
		for (var i = 0; i < nextCells.length; i++) {
			var nextCell = nextCells[i];
			if (!getObject(nextCell)) adjacentEmptyCells.push(nextCell);
		}
		return adjacentEmptyCells;
	}
	function getAdjacentCells(cell, dontSort) {
		if (!dontSort) sortDirectionsArray(reuseableDirections);
		var adjacentCells = [];
		for (var i = 0; i < reuseableDirections.length; i++) {
			var nextCell = getNextCell(cell, reuseableDirections[i]);
			if (nextCell) adjacentCells.push(nextCell);
		}
		return adjacentCells;
	}
	
	function getEmptyRequiredCells() {
		var emptyRequiredCells = [];
		for (var i = 0; i < emptyCells.length; i++) {
			var emptyCell = emptyCells[i];
			if (isRequiredEndpoint(emptyCell))
				emptyRequiredCells.push(emptyCell);
		}
		return emptyRequiredCells;
	}
	
	function linkCells(srcCell, dstCell, colorIndex) {
		var srcObj = getObject(srcCell);
		if (srcObj.constructor == Circle)
			srcObj.linkedCell = dstCell;
		else
			srcObj.nextCell = dstCell;
		var dstObj = getObject(dstCell);
		if (!dstObj) setObject(dstCell, dstObj = new Link(colorIndex));
		if (dstObj.constructor == Circle)
			dstObj.linkedCell = srcCell;
		else
			dstObj.prevCell = srcCell;
		drawDirection(srcCell, dstCell, colorIndex);
	}
	function unlinkCells(srcCell, dstCell) {
		var srcObj = getObject(srcCell);
		if (srcObj.constructor == Circle)
			srcObj.linkedCell = null;
		else
			srcObj.nextCell = null;
		var dstObj = getObject(dstCell);
		if (dstObj.constructor == Circle)
			dstObj.linkedCell = null;
		else
			setObject(dstCell, null);
		deleteDirection(srcCell);
	}
	
	function checkForDeadSpot(cell, dstCircle) {
		var adjacentEmptyCells = getAdjacentEmptyCells(cell);
		var deadEnds = 0;
		var foundDstCircle;
		var original = getObject(cell); //bad design
		setObject(cell, new Link()); //bad design
		for (var i = 0; i < adjacentEmptyCells.length; i++) {
			var adjacentEmptyCell = adjacentEmptyCells[i];
			var connectedEmptyCells = getConnectedEmptyCells(adjacentEmptyCell, [], 3);
			if (connectedEmptyCells.length < 3) {
				for (var j = 0; j < connectedEmptyCells.length; j++) {
					var connectedEmptyCell = connectedEmptyCells[j];
					if ($.inArray(dstCircle, getAdjacentObjects(connectedEmptyCell)) != -1) {
						foundDstCircle = adjacentEmptyCell;
						break;
					}
				}
				deadEnds++;
			}
		}
		setObject(cell, original); //bad design
		if (deadEnds > 1)
			return 1;
		if (deadEnds == 0)
			return 0;
		return foundDstCircle || 1;
	}
	
	function traverseCells(prevCell, curCell, dstCircle) {
		var obj = getObject(curCell);
		var done = obj == dstCircle;
		
		if (obj && //don't collide with another object
			!done && prevCell) //also make sure you haven't looped back to the origin
			return false;
		
		var deadSpotResult = checkForDeadSpot(curCell, dstCircle);
		if (deadSpotResult == 1)
			return false;
		
		if (prevCell) linkCells(prevCell, curCell, dstCircle.colorIndex);
		
		if (done) {
			if (startNewColor(dstCircle.colorIndex + 1))
				return true;
		} else {
			var alreadyTried = [];
			if (deadSpotResult.constructor == Cell) {
				if (traverseCells(curCell, deadSpotResult, dstCircle))
					return true;
				alreadyTried.push(deadSpotResult);
			}
			
			var nextCells = getAdjacentCells(curCell);
			nextCells.remove(alreadyTried);
			for (var i = 0; i < nextCells.length; i++) {
				if (shouldSkipColor(dstCircle.colorIndex))
					break;
				var nextCell = nextCells[i];
				//don't cut off a corner cell
				if (checkForRequiredDirection(nextCell))
				{
					if (traverseCells(curCell, nextCell, dstCircle))
						return true;
					alreadyTried.push(nextCell);
				}
			}
			nextCells.remove(alreadyTried);
			for (var i = 0; i < nextCells.length; i++) {
				if (shouldSkipColor(dstCircle.colorIndex))
					break;
				var nextCell = nextCells[i];
				if (traverseCells(curCell, nextCell, dstCircle))
					return true;
			}
		}
		
		if (prevCell) unlinkCells(prevCell, curCell);
		return false;
	}
	
	function pairCircles(srcCircle, dstCircle) {		
		return traverseCells(null, srcCircle.cell, dstCircle);
	}
	
	function getConnectedEmptyCells(curCell, emptyCells, shortCircuitValue) {
		if (emptyCells.length == shortCircuitValue ||
			//don't double count
			$.inArray(curCell, emptyCells) != -1)
			return emptyCells;
		emptyCells.push(curCell);
		var nextCells = getAdjacentEmptyCells(curCell);
		for (var i = 0; i < nextCells.length; i++)
			emptyCells = getConnectedEmptyCells(nextCells[i], emptyCells, shortCircuitValue);
		return emptyCells;
	}
	
	//if the remaining area is impossible to fill
	//this will help short circuit colors to get area opened up
	var colorToRevert = null;
	function setColorToRevert() {
		for (var i = 0; i < emptyCells.length; i++) {
			var objs = getAdjacentObjects(emptyCells[i]);
			for (var j = 0; j < objs.length; j++) {
				var colorIndex = objs[j].colorIndex;
				if (colorToRevert == null || colorIndex < colorToRevert)
					colorToRevert = colorIndex;
			}
		}
	}
	function shouldSkipColor(colorIndex) {
		return colorToRevert != null && colorToRevert != colorIndex;
	}
	
	var historicCirclePlacement = [];
	function startNewColor(colorIndex) {
		if (colorIndex == numOfColors && emptyCells.length > 0) {
			setColorToRevert();
			return false;
		}
		if (colorIndex < numOfColors || (numOfColors == -1 && emptyCells.length > 0)) {
			historicCirclePlacement.push([]);
			colorToRevert = null;
			var canPairCircles;
			do {
				var circleGroup = placeCircles(colorIndex);
				if (!circleGroup) {
					setColorToRevert();
					historicCirclePlacement.pop();
					return false;
				}
				var srcCircle = circleGroup.srcCircle;
				var dstCircle = circleGroup.dstCircle;
				if (!(canPairCircles = pairCircles(srcCircle, dstCircle))) {
					setObject(srcCircle.cell, null);
					setObject(dstCircle.cell, null);
					deleteCircle(srcCircle);
					deleteCircle(dstCircle);
					if (shouldSkipColor(colorIndex)) {
						historicCirclePlacement.pop();
						return false;
					}
				}
			} while (!canPairCircles);
		}
		return true;
	}
	startNewColor(0);
	
	var hueMultiplier = 360 / historicCirclePlacement.length;
	for (var colorIndex = 0; colorIndex < historicCirclePlacement.length; colorIndex++) {
		var color = convertHsvToRgb(colorIndex * hueMultiplier, 1, 1);
		gridDiv.find('circle[colorIndex="' + colorIndex + '"]').attr('fill', color);
		gridDiv.find('.link[colorIndex="' + colorIndex + '"]').css('background-color', color);
	}
}

function Direction(x, y) {
	this.x = x;
	this.y = y;
}
	
function Cell(row, col) {
	this.row = row;
	this.col = col;
}

function Circle(cell, colorIndex, linkedCell) {
	this.cell = cell;
	this.colorIndex = colorIndex;
	this.linkedCell = linkedCell;
}

function Link(colorIndex, prevCell, nextCell) {
	this.colorIndex = colorIndex;
	this.prevCell = prevCell;
	this.nextCell = nextCell;
}

function CirclePlacement(srcCell, dstCell) {
	this.srcCell = srcCell;
	this.dstCell = dstCell;
}

//0 <= h <= 360, 0 <= s <=1, 0 <= v <= 1
function convertHsvToRgb(h, s, v) {
	var c = v * s;
	var hPrime = h / 60;
	var x = c * (1 - Math.abs(hPrime % 2 - 1))
	var r, g, b;
	switch (Math.floor(hPrime)) {
		case 0: r = c; g = x; b = 0; break;
		case 1: r = x; g = c; b = 0; break;
		case 2: r = 0; g = c; b = x; break;
		case 3: r = 0; g = x; b = c; break;
		case 4: r = x; g = 0; b = c; break;
		case 5: r = c; g = 0; b = x; break;
	}
	var m = v - c;
	r += m; g += m; b +=m;
	function convertToHex(num) {
		return ('0' + Math.round(num * 255).toString(16)).substr(-2);
	}
	return '#' + convertToHex(r) + convertToHex(g) + convertToHex(b);
}
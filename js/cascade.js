$(function() {
	var gridDiv = $('#grid');
	var rowsInput = $('#rows');
	var colsInput = $('#cols');
	var defaultColors = $('#defaultColors');
	var randomColors = $('#randomColors');
	var specifyColors = $('#specifyColors');
	var seedInput = $('#seed');
	
	var gridHeight = gridDiv.height();
	var gridWidth = gridDiv.width();
	
	var randFunc = function() { return 0.5 - Math.random() };
	
	var cells;
	var gridArray, solvedGridArray;
	var circleDiameter;
	var circleRadius;
	var debug = false;
	
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
			if (gridArray.getObject(nextCells[i]))
				obstacleCount++;
		return obstacleCount;
	}
	
	//don't create dead ends
	function isRequiredEndpoint(cell) {
		return getObstacleCount(cell) == 3;
	}
	
	function placeCircle(cell, colorIndex) {
		var circle = new Circle(cell, colorIndex);
		gridArray.setObject(cell, circle);
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
		gridArray.emptyCells.sort(randFunc);
		
		var emptyRequiredCells = getEmptyRequiredCells();
		var retVal = placeCirclesByRound(emptyRequiredCells, emptyRequiredCells.length == 1
			? gridArray.emptyCells : emptyRequiredCells, colorIndex);
		if (retVal) return retVal;
		
		var emptyNonRequiredCells = gridArray.emptyCells.slice(0);
		emptyNonRequiredCells.remove(emptyRequiredCells);
		var retVal = placeCirclesByRound(emptyNonRequiredCells, emptyNonRequiredCells, colorIndex);
		if (retVal) return retVal;
		
		return undefined;
	}
	
	function getCellDiv(cell) {
		return gridDiv.children().eq(cell.row).children().eq(cell.col);
	}
	function getCellByDiv(cellDiv) {
		var rowDiv = cellDiv.parent();
		var col = $.inArray(cellDiv[0], rowDiv.children());
		var row = $.inArray(rowDiv[0], gridDiv.children());
		return getCell(row, col);
	}
	
	function drawCircle(circle) {
		getCellDiv(circle.cell).append(
			$('<svg class="circle" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
				'<circle ' +
					'cx="' + circleRadius + '" ' +
					'cy="' + circleRadius + '" ' +
					'r="' + circleRadius + '" ' +
					'colorIndex="' + circle.colorIndex + '" ' +
					'fill="white" ' +
				'/>' +
			'</svg>')
				.height(circleDiameter)
				.width(circleDiameter)
				.css('position', 'absolute')
				.css('left', circleRadius)
				.css('top', circleRadius)
		);
	}
	function deleteCircle(circle) {
		getCellDiv(circle.cell).find('.circle').remove();
	}
	function drawDirection(thisCell, nextCell, colorIndex, color) {
		var thisCellDiv = getCellDiv(thisCell);
		var nextCellDiv = getCellDiv(nextCell);
		var thisCellOffset = thisCellDiv.offset();
		var nextCellOffset = nextCellDiv.offset();
		var y = nextCellOffset.top - thisCellOffset.top;
		var x = nextCellOffset.left - thisCellOffset.left;
		thisCellDiv.append(
			$('<div class="link"></div>')
				.attr('colorIndex', colorIndex)
				.css('background-color', color)
				.height(Math.max(Math.abs(y), 1))
				.width(Math.max(Math.abs(x), 1))
				.offset({
					top: y / 2 || circleDiameter,
					left: x / 2 || circleDiameter
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
			var obj = gridArray.getObject(nextCells[i]);
			if (obj) objects.push(obj);
		}
		return objects;
	}
	function getAdjacentEmptyCells(cell) {
		var nextCells = getAdjacentCells(cell, true);
		var adjacentEmptyCells = [];
		for (var i = 0; i < nextCells.length; i++) {
			var nextCell = nextCells[i];
			if (!gridArray.getObject(nextCell)) adjacentEmptyCells.push(nextCell);
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
		for (var i = 0; i < gridArray.emptyCells.length; i++) {
			var emptyCell = gridArray.emptyCells[i];
			if (isRequiredEndpoint(emptyCell))
				emptyRequiredCells.push(emptyCell);
		}
		return emptyRequiredCells;
	}
	
	function linkCells(prevCell, curCell, paint, colorIndex, color) {
		var prevObj = gridArray.getObject(prevCell);
		var step;
		if (prevObj.constructor == Circle) {
			prevObj.linkedCell = curCell;
			step = 1;
		}
		else {
			prevObj.nextCell = curCell;
			step = prevObj.step + 1;
		}
		var curObj = gridArray.getObject(curCell);
		if (!curObj) gridArray.setObject(curCell, curObj = new Link(colorIndex, step));
		if (curObj.constructor == Circle)
			curObj.linkedCell = prevCell;
		else
			curObj.prevCell = prevCell;
		if (paint)
			drawDirection(prevCell, curCell, colorIndex || 0, color || 'white');
	}
	function unlinkCells(curCell, endCell, paint) {
		if (curCell == endCell) return;
		var nextCell;
		var curObj = gridArray.getObject(curCell);
		if (curObj.constructor == Circle) {
			nextCell = curObj.linkedCell;
			curObj.linkedCell = null;
		} else {
			nextCell = curObj.prevCell;
			gridArray.setObject(curCell, null);
		}
		var nextObj = gridArray.getObject(nextCell);
		if (nextObj.constructor == Circle)
			nextObj.linkedCell = null;
		else
			nextObj.nextCell = null;
		if (paint)
			deleteDirection(nextCell);
		unlinkCells(nextCell, endCell, paint);
	}
	
	function checkForDeadSpot(cell, dstCircle) {
		var adjacentEmptyCells = getAdjacentEmptyCells(cell);
		var deadEnds = 0;
		var foundDstCircle;
		var original = gridArray.getObject(cell); //bad design
		gridArray.setObject(cell, new Link()); //bad design
		for (var i = 0; i < adjacentEmptyCells.length; i++) {
			var adjacentEmptyCell = adjacentEmptyCells[i];
			var connectedEmptyCells = getConnectedEmptyCells(adjacentEmptyCell, [], 3);
			if (connectedEmptyCells.length < 3) {
				for (var j = 0; j < connectedEmptyCells.length; j++) {
					var connectedEmptyCell = connectedEmptyCells[j];
					if (getAdjacentObjects(connectedEmptyCell).contains(dstCircle)) {
						foundDstCircle = adjacentEmptyCell;
						break;
					}
				}
				deadEnds++;
			}
		}
		gridArray.setObject(cell, original); //bad design
		if (deadEnds > 1)
			return 1;
		if (deadEnds == 0)
			return 0;
		return foundDstCircle || 1;
	}
	
	function traverseCells(prevCell, curCell, dstCircle) {
		var obj = gridArray.getObject(curCell);
		var done = obj == dstCircle;
		
		if (obj && //don't collide with another object
			!done && prevCell) //also make sure you haven't looped back to the origin
			return false;
		
		var deadSpotResult = checkForDeadSpot(curCell, dstCircle);
		if (deadSpotResult == 1)
			return false;
		
		if (prevCell) linkCells(prevCell, curCell, debug, dstCircle.colorIndex);
		
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
		
		if (prevCell) unlinkCells(curCell, prevCell, debug);
		return false;
	}
	
	function pairCircles(srcCircle, dstCircle) {
		if (traverseCells(null, srcCircle.cell, dstCircle)) {
			srcCircle.dstCircle = dstCircle;
			dstCircle.srcCircle = srcCircle;
			return true;
		}
		return false;
	}
	
	function getConnectedEmptyCells(curCell, emptyCells, shortCircuitValue) {
		if (emptyCells.length == shortCircuitValue ||
			//don't double count
			emptyCells.contains(curCell))
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
		for (var i = 0; i < gridArray.emptyCells.length; i++) {
			var objs = getAdjacentObjects(gridArray.emptyCells[i]);
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
	
	var historicCirclePlacement;
	function startNewColor(colorIndex) {
		if (colorIndex == numOfColors && gridArray.emptyCells.length > 0) {
			setColorToRevert();
			return false;
		}
		if (colorIndex < numOfColors || (numOfColors == -1 && gridArray.emptyCells.length > 0)) {
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
					gridArray.setObject(srcCircle.cell, null);
					gridArray.setObject(dstCircle.cell, null);
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
	
	function generate() {
		gridDiv.empty();
		
		rowCount = parseInt(rowsInput.val());
		colCount = parseInt(colsInput.val());
		
		numOfColors = defaultColors.attr('checked') == 'checked'
			? Math.min(rowCount, colCount) : randomColors.attr('checked') == 'checked'
			? -1 : parseInt($('#numOfColors').val());
		
		var cellHeight = (gridHeight - rowCount - 1) / rowCount;
		var cellWidth = (gridWidth - colCount - 1) / colCount;
		var cellSize = Math.min(cellHeight, cellWidth);
		
		cells = [];
		gridArray = new Grid(rowCount, colCount);
		historicCirclePlacement = [];
		for (var row = 0; row < rowCount; row++) {
			var rowDiv = $('<div class="row"></div>');
			for (var col = 0; col < colCount; col++) {
				var cellDiv = $('<div class="cell"></div>');
				cellDiv.height(cellSize).width(cellSize);
				rowDiv.append(cellDiv);
				
				var cell = new Cell(row, col);
				cells.push(cell);
				gridArray.emptyCells.push(cell);
			}
			gridDiv.append(rowDiv);
		}
		
		circleDiameter = cellSize / 2;
		circleRadius = cellSize / 4;
		
		var seed = seedInput.val() || Math.random().toString().substr(2);
		//seed = '27878770721144974';
		Math.seedrandom(seed);
		
		startNewColor(0);
		
		var hueMultiplier = 360 / historicCirclePlacement.length;
		for (var colorIndex = 0; colorIndex < historicCirclePlacement.length; colorIndex++) {
			var color = convertHsvToRgb(colorIndex * hueMultiplier, 1, 1);
			gridDiv.find('circle[colorIndex="' + colorIndex + '"]').attr('fill', color);
			if (debug)
				gridDiv.find('.link[colorIndex="' + colorIndex + '"]').css('background-color', color);
		}
		
		solvedGridArray = gridArray;
		gridArray = new Grid(rowCount, colCount);
		for (var row = 0; row < rowCount; row++) {
			for (var col = 0; col < colCount; col++) {
				var cell = getCell(row, col);
				var obj = solvedGridArray.getObject(cell);
				if (obj.constructor == Circle)
					gridArray.setObject(cell, new Circle(
						obj.cell, obj.colorIndex, obj.srcCircle, obj.dstCircle));
			}
		}
		if (debug)
			gridDiv.find('.link').remove();
		
		$('#rowsLabel').text(rowCount);
		$('#colsLabel').text(colCount);
		$('#numOfColorsLabel').text(historicCirclePlacement.length);
		$('#seedLabel').text(seed);
	}
	
	var generateButton = $('#generate');
	$('[name="colors"]').change(function() {
		$('#specifyColorsDiv').toggle(specifyColors.attr('checked') == 'checked');
	});
	generateButton.click(generate);
	rowsInput.val(4);
	colsInput.val(4);
	defaultColors.click();
	generateButton.click();

	function play() {
		var mouseDown;
		var colorIndex;
		var color;
		var lastCell;
		function updateClasses(lastCellDiv, curCellDiv) {
			//code duplication, but easy to understand
			if (lastCellDiv.find('circle').length) { //leaving from start
				lastCellDiv.addClass('startCell');
				curCellDiv.addClass('endCell');
			} else if (curCellDiv.find('circle').length) { //reached a circle
				if (curCellDiv.hasClass('startCell')) { //back to start
					lastCellDiv.removeClass('endCell');
					curCellDiv.removeClass('startCell');
				} else { //reached the end
					lastCellDiv.removeClass('endCell');
					curCellDiv.addClass('endCell');
				}
			} else { //just another link
				lastCellDiv.removeClass('endCell');
				curCellDiv.addClass('endCell');
			}
		}
		gridDiv.find('.cell').mousedown(function() {
			var cellDiv = $(this);
			
			var cell = getCellByDiv(cellDiv);
			var obj = gridArray.getObject(cell);
			if (!obj) return;
			
			colorIndex = obj.colorIndex;
			
			var startCellDiv = gridDiv.find('.startCell').has('circle[colorIndex="' + colorIndex + '"]');
			if (startCellDiv.length) {
				var startCell = getCellByDiv(startCellDiv);
				var endCell = getCellByDiv(gridDiv.find('.endCell').has('[colorIndex="' + colorIndex + '"]').removeClass('endCell'));
				unlinkCells(endCell, obj.constructor == Link ? cell : startCell, true);
				if (obj.constructor == Circle)
					startCellDiv.removeClass('startCell');
			} else
				startCellDiv = cellDiv;
			color = startCellDiv.find('circle').attr('fill');
			
			mouseDown = true;
			
			lastCell = cell;
			
			return false;
		}).mouseenter(function(e) {
			if (!mouseDown) return;
			var cellDiv = $(e.target);
			if (!cellDiv.is('.cell'))
				return;
			
			//couldn't go forward, then came back
			var cell = getCellByDiv(cellDiv);
			if (cell == lastCell)
				return;
			
			var lastCellDiv = getCellDiv(lastCell);
			
			//backtrack to close a loop
			var link = cellDiv.find('.link');
			if (link.length && link.attr('colorIndex') == colorIndex) {
				unlinkCells(lastCell, cell, true);
				updateClasses(lastCellDiv, cellDiv);
				lastCell = cell;
				return;
			}
			
			//already done, don't go further
			if (lastCellDiv.hasClass('endCell'))
				return;
			
			//can't move to taken cells, except if it's your end circle
			var obj = gridArray.getObject(cell);
			if (obj && !(obj.constructor == Circle && obj.colorIndex == colorIndex))
				return;
			
			//only move one cell at a time
			var foundLastCell;
			var adjacentCells = getAdjacentCells(cell);
			for (var i = 0; i < adjacentCells.length; i++)
				if (adjacentCells[i] == lastCell) {
					foundLastCell = true;
					break;
				}
			if (!foundLastCell) return;
			
			linkCells(lastCell, cell, true, colorIndex, color);
			updateClasses(lastCellDiv, cellDiv);
			lastCell = cell;
		});
		function mouseUp() { mouseDown = false }
		gridDiv.mouseup(mouseUp);
		$(document).mouseleave(mouseUp);
	}
	play();
});

function Grid(rowCount, colCount) {
	for (var row = 0; row < rowCount; row++) {
		this[row] = [];
	}
	this.emptyCells = [];
	this.getObject = function(cell) {
		return this[cell.row][cell.col];
	}
	this.setObject = function(cell, obj) {
		this[cell.row][cell.col] = obj;
		if (obj) this.emptyCells.remove(cell);
		else this.emptyCells.push(cell);
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

function Circle(cell, colorIndex, srcCircle, dstCircle, linkedCell) {
	this.cell = cell;
	this.colorIndex = colorIndex;
	this.srcCircle = srcCircle;
	this.dstCircle = dstCircle;
	this.linkedCell = linkedCell;
}

function Link(colorIndex, step, prevCell, nextCell) {
	this.colorIndex = colorIndex;
	this.step = step;
	this.prevCell = prevCell;
	this.nextCell = nextCell;
}

function CirclePlacement(srcCell, dstCell) {
	this.srcCell = srcCell;
	this.dstCell = dstCell;
}
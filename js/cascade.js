$(function() {
	var gridDiv = $('#grid');
	var rowsInput = $('#rows').val($.url.getQuery('rows') || 4);
	var colsInput = $('#cols').val($.url.getQuery('cols') || 4);
	var colors = parseInt($.url.getQuery('colors') || 0);
	var defaultColors = $('#defaultColors');
	var randomColors = $('#randomColors');
	var specifyColors = $('#specifyColors');
	var numOfColorsInput = $('#numOfColors').val(colors > 0 ? colors : '');
	var seedInput = $('#seed').val($.url.getQuery('seed'));

	var gridHeight = gridDiv.height();
	var gridWidth = gridDiv.width();
	
	var randFunc = function() { return 0.5 - Math.random() };
	
	var cells;
	var gridArray, solvedGridArray;
	var cellSize, halfCellSize;
	var endPointDiameter, endPointRadius;
	var linkJointDiameter, linkJointRadius;
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
						drawEndPoint(srcCircle);
						drawEndPoint(dstCircle);
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
	
	function drawCircle(cell, cssClass, colorIndex, color, diameter, radius) {
		getCellDiv(cell).append(
			$('<svg class="' + cssClass + '" xmlns="http://www.w3.org/2000/svg" version="1.1">' +
				'<circle ' +
					'cx="' + radius + '" ' +
					'cy="' + radius + '" ' +
					'r="' + radius + '" ' +
					'colorIndex="' + colorIndex + '" ' +
					'fill="' + color + '" ' +
				'/>' +
			'</svg>')
				.height(diameter)
				.width(diameter)
				.css('position', 'absolute')
				.css('left', halfCellSize - radius)
				.css('top', halfCellSize - radius)
		);
	}
	function drawEndPoint(circle) {
		drawCircle(circle.cell, 'endCircle', circle.colorIndex, 'white', endPointDiameter, endPointRadius);
	}
	function deleteCircle(cell, cssClass) {
		getCellDiv(cell).find('.' + cssClass).remove();
	}
	function deleteEndCircle(circle) {
		deleteCircle(circle.cell, 'endCircle');
	}
	function drawDirection(thisCell, nextCell, colorIndex, color) {
		var y = (nextCell.row - thisCell.row) * halfCellSize;
		var x = (nextCell.col - thisCell.col) * halfCellSize;
		function getHtml(linkCell, x, y) {
			return '<div class="link" colorIndex="' + colorIndex + '" linkCell="' + linkCell.index + '" style="' +
				'background-color: ' + color + ';' +
				'height: ' + Math.max(Math.abs(y), linkJointDiameter) + 'px;' +
				'width: ' + Math.max(Math.abs(x), linkJointDiameter) + 'px;' +
				'top: ' + Math.max(y || (halfCellSize - linkJointRadius), 0) + 'px;' +
				'left: ' + Math.max(x || (halfCellSize - linkJointRadius), 0) + 'px;' +
			'"></div>';
		}
		getCellDiv(thisCell).append(getHtml(nextCell, x, y));
		getCellDiv(nextCell).append(getHtml(thisCell, -x, -y));
		drawCircle(nextCell, 'linkCircle', colorIndex, color, linkJointDiameter, linkJointRadius);
	}
	function deleteDirection(thisCell, nextCell) {
		getCellDiv(thisCell).find('[linkCell="' + nextCell.index + '"]').remove();
		getCellDiv(nextCell).find('[linkCell="' + thisCell.index + '"]').remove();
		deleteCircle(thisCell, 'linkCircle');
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
		color = color || 'white';
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
		if (!curObj) gridArray.setObject(curCell, curObj = new Link(colorIndex, color, step));
		if (curObj.constructor == Circle)
			curObj.linkedCell = prevCell;
		else
			curObj.prevCell = prevCell;
		if (paint)
			drawDirection(prevCell, curCell, colorIndex, color);
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
			deleteDirection(curCell, nextCell);
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
					deleteEndCircle(srcCircle);
					deleteEndCircle(dstCircle);
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
			? -1 : parseInt(numOfColorsInput.val());
		
		var cellHeight = (gridHeight - rowCount - 1) / rowCount;
		var cellWidth = (gridWidth - colCount - 1) / colCount;
		cellSize = Math.min(cellHeight, cellWidth);
		halfCellSize = cellSize / 2;
		
		cells = [];
		gridArray = new Grid(rowCount, colCount);
		historicCirclePlacement = [];
		for (var row = 0; row < rowCount; row++) {
			var rowDiv = $('<div class="row"></div>');
			for (var col = 0; col < colCount; col++) {
				var cellDiv = $('<div class="cell"></div>');
				cellDiv.height(cellSize).width(cellSize);
				rowDiv.append(cellDiv);
				
				var cell = new Cell(row * colCount + col, row, col);
				cells.push(cell);
				gridArray.emptyCells.push(cell);
			}
			gridDiv.append(rowDiv);
		}
		
		endPointDiameter = cellSize * .7;
		endPointRadius = cellSize * .35;
		linkJointDiameter = cellSize / 3;
		linkJointRadius = cellSize / 6;
		
		var seed = seedInput.val() || Math.random().toString().substr(2);
		//seed = '27878770721144974';
		Math.seedrandom(seed);
		
		startNewColor(0);
		
		var hueMultiplier = 360 / historicCirclePlacement.length;
		for (var colorIndex = 0; colorIndex < historicCirclePlacement.length; colorIndex++) {
			var color = convertHsvToRgb(colorIndex * hueMultiplier, 1, 1);
			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i];
				var obj = gridArray.getObject(cell);
				if (obj && obj.constructor == Circle && obj.colorIndex == colorIndex)
					obj.color = color;
			}
			gridDiv.find('.endCircle circle[colorIndex="' + colorIndex + '"]').attr('fill', color);
			if (debug) {
				gridDiv.find('.link[colorIndex="' + colorIndex + '"]').css('background-color', color);
				gridDiv.find('.linkCircle circle[colorIndex="' + colorIndex + '"]').attr('fill', color);
			}
		}
		
		solvedGridArray = gridArray;
		gridArray = new Grid(rowCount, colCount);
		for (var i = 0; i < cells.length; i++) {
			var cell = cells[i];
			var obj = solvedGridArray.getObject(cell);
			if (obj.constructor == Circle)
				gridArray.setObject(cell, new Circle(
					obj.cell, obj.colorIndex, obj.color, obj.srcCircle, obj.dstCircle));
		}
		if (debug)
			gridDiv.find('.link').remove();
		
		$('#rowsLabel').text(rowCount);
		$('#colsLabel').text(colCount);
		$('#numOfColorsLabel').text(historicCirclePlacement.length);
		$('#seedLabel').text(seed);
		$('#share').val($.url.getPath() + '?' +
			'rows=' + rowCount + '&' +
			'cols=' + colCount + '&' +
			'colors=' + colors + '&' +
			'seed=' + seed);
		
		play();
	}

	function play() {
		var mouseDown;
		var colorIndex;
		var color;
		var lastCell;
		var didIWin;
		var cellDivs = gridDiv.find('.cell');
		function updateClasses(lastCellDiv, curCellDiv) {
			//code duplication, but easy to understand
			if (curCellDiv.find('.endCircle').length) { //reached a circle
				if (curCellDiv.hasClass('startCell')) { //back to start
					lastCellDiv.removeClass('endCell');
					curCellDiv.removeClass('startCell');
				} else { //reached the end
					lastCellDiv.removeClass('endCell');
					curCellDiv.addClass('endCell');
				}
			} else if (lastCellDiv.find('.endCircle').length) { //moving from circle
				if (lastCellDiv.hasClass('endCell')) { //leaving from end
					lastCellDiv.removeClass('endCell');
					curCellDiv.addClass('endCell');
				} else { //leaving from start
					lastCellDiv.addClass('startCell');
					curCellDiv.addClass('endCell');
				}
			} else { //just another link
				lastCellDiv.removeClass('endCell');
				curCellDiv.addClass('endCell');
			}
		}
		function highlightCell(cellDiv, obj) {
			if (obj)
				gridDiv.css('background-color', obj.color);
			cellDiv.css('opacity', '0.75');
		}
		function unhighlightAll() {
			gridDiv.css('background-color', '');
			cellDivs.css('opacity', '');
		}
		cellDivs.mousedown(function() {
			var cellDiv = $(this);
			
			var cell = getCellByDiv(cellDiv);
			var obj = gridArray.getObject(cell);
			if (!obj)
				return false;
			
			colorIndex = obj.colorIndex;
			color = obj.color;
			
			var startCellDiv = gridDiv.find('.startCell').has('circle[colorIndex="' + colorIndex + '"]');
			if (startCellDiv.length) {
				var startCell = getCellByDiv(startCellDiv);
				var endCell = getCellByDiv(gridDiv.find('.endCell').has('[colorIndex="' + colorIndex + '"]').removeClass('endCell'));
				unlinkCells(endCell, obj.constructor == Link || cell == endCell ? cell : startCell, true);
				if (obj.constructor == Circle)
					startCellDiv.removeClass('startCell');
				else
					cellDiv.addClass('endCell');
			}
			
			mouseDown = true;
			
			lastCell = cell;
			
			return false;
		}).mouseenter(function(e) {
			var cellDiv = $(e.target);
			if (!cellDiv.is('.cell'))
				return;
			
			unhighlightAll();
			var cell = getCellByDiv(cellDiv);
			var obj = gridArray.getObject(cell);
			highlightCell(cellDiv, obj);
			
			if (!mouseDown)
				return;
			
			//couldn't go forward, then came back
			if (cell == lastCell)
				return;
			
			var lastCellDiv = getCellDiv(lastCell);
			
			//backtrack to close a loop
			var link = cellDiv.find('.link');
			if (link.length && link.attr('colorIndex') == colorIndex) {
				unlinkCells(lastCell, cell, true);
				updateClasses(lastCellDiv, cellDiv);
				lastCell = cell;
				highlightCell(cellDiv, gridArray.getObject(cell));
				return;
			}
			
			//already done, don't go further
			if (lastCellDiv.has('.endCircle').hasClass('endCell'))
				return;
			
			//can't move to taken cells, except if it's your end circle
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
			if (!foundLastCell)
				return;
			
			linkCells(lastCell, cell, true, colorIndex, color);
			updateClasses(lastCellDiv, cellDiv);
			lastCell = cell;
			highlightCell(cellDiv, gridArray.getObject(cell));
		});
		function mouseUp() {
			mouseDown = false;
			
			if (!didIWin) {
				didIWin = true;
				for (var row = 0; row < rowCount; row++) {
					for (var col = 0; col < colCount; col++) {
						if (!gridArray.getObject(getCell(row, col))) {
							didIWin = false;
							break;
						}
					}
				}
				if (didIWin)
					alert('you win');
			}
			
			lastCell = null;
		}
		gridDiv.mouseup(mouseUp).mouseleave(function() {
			mouseUp();
			unhighlightAll();
		});
		$(document).mouseleave(mouseUp);
	}
	
	var generateButton = $('#generate');
	$('[name="colors"]').change(function() {
		$('#specifyColorsDiv').toggle(specifyColors.attr('checked') == 'checked');
	});
	switch(colors) {
		case -1:
			randomColors.click();
			break;
		case 0:
			defaultColors.click();
			break;
		default:
			specifyColors.click();
			break;
	}
	generateButton.click(generate);
	generateButton.click();
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
	
function Cell(index, row, col) {
	this.index = index;
	this.row = row;
	this.col = col;
}

function Circle(cell, colorIndex, color, srcCircle, dstCircle, linkedCell) {
	this.cell = cell;
	this.colorIndex = colorIndex;
	this.color = color;
	this.srcCircle = srcCircle;
	this.dstCircle = dstCircle;
	this.linkedCell = linkedCell;
}

function Link(colorIndex, color, step, prevCell, nextCell) {
	this.colorIndex = colorIndex;
	this.color = color;
	this.step = step;
	this.prevCell = prevCell;
	this.nextCell = nextCell;
}

function CirclePlacement(srcCell, dstCell) {
	this.srcCell = srcCell;
	this.dstCell = dstCell;
}
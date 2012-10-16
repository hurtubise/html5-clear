C.touch = (function () {

	var data 		= {},
		t 			= C.client.isTouch,
		start 		= t ? 'touchstart' : 'mousedown',
		move 		= t ? 'touchmove' : 'mousemove',
		end 		= t ? 'touchend' : 'mouseup';

	var dragThreshold = 20;

	var touch = {

		init: function () {

			C.log('Touch: init');

			// prevent page dragging
			$(document.body).on('touchstart touchmove touchend', function (e) {
				e.preventDefault();
			});

			initListEvents();
			initItemEvents();

		},

		data: data

	};

	function initListEvents () {

		C.$wrapper
			.on(start, function (e) {

				e = t ? e.touches[0] : e;

				data.isDown = true;
				data.ox = data.cx = e.pageX;
				data.oy = data.cy = e.pageY;
				data.ct = Date.now();

			})
			.on(move, function (e) {

				if (!data.isDown) return;
				e = t ? e.touches[0] : e;

				data.dx = e.pageX - data.cx;
				data.cx = e.pageX;
				data.tdx = data.cx - data.ox;
				data.dy = e.pageY - data.cy;
				data.cy = e.pageY;
				data.tdy = data.cy - data.oy;

				if (data.draggingItem) return;

				var now = Date.now();
				data.dt = now - data.ct;
				data.ct = now;

				if (!data.dragging && !data.longTapDragging && Math.abs(data.tdy) > dragThreshold) {
					data.dragging = true;
					C.currentCollection.onDragStart();
					return;
				}

				if (data.dragging) {
					C.currentCollection.onDragMove(data.dy);
				}
				
			})
			.on(end, function (e) {

				if (t && e.touches.length) return;
				if (data.draggingItem || data.longTapDragging) return;

				if (data.dragging) {
					data.isDown = false;
					data.dragging = false;
					var speed = data.dy / data.dt;
					C.currentCollection.onDragEnd(speed);
				}

				data = touch.data = {};
				
			});

		// Fix for mouseout on desktop

		if (!t) {
			C.$wrapper.on('mouseout', function (e) {

				var x = e.pageX,
					y = e.pageY,
					c = C.client;

				if (x <= c.left ||
					x >= c.right ||
					y <= c.top ||
					y >= c.bottom) {

					C.$wrapper.trigger(end);

				}

			});
		}

	}

	function initItemEvents () {

		// Horizontal drag

		var item;

		C.$wrapper
			.on(start, '.item', function (e) {

				if (item) return;
				item = C.currentCollection.getItem(+this.dataset.id);

			})
			.on(move, function (e) {

				if (!item || data.dragging || data.longTapDragging) return;

				if (!data.draggingItem && Math.abs(data.tdx) > dragThreshold) {
					data.draggingItem = true;
					item.onDragStart();
					return;
				}

				if (data.draggingItem) {
					item.onDragMove(data.dx);
				}

			})
			.on(end, function (e) {

				if (t && e.touches.length > 0) return;

				if (data.draggingItem) {
					item.onDragEnd();
					data = touch.data = {};
				}

				item = null;

			});

		// Tap, LongTap
		var tapTarget,
			moved,
			startTime,
			ltTimeout,
			ltTarget,
			ltDelay = 400;

		function cancelLongTap () {
			if (ltTimeout) {
				clearTimeout(ltTimeout);
				ltTimeout = null;
			}
		}

		function longTap () {
			if (tapTarget) {
				data.longTapDragging = true;
				ltTarget = C.currentCollection.getItem(+tapTarget.dataset.id);
				ltTarget.onLongTap();
				ltTimeout = null;
			}
		}

		C.$wrapper
			.on(start, '.item', function () {
				moved = false;
				tapTarget = this;
				startTime = Date.now();
				ltTimeout = setTimeout(longTap, ltDelay);
			})
			.on(move, function () {
				moved = true;
				cancelLongTap();
				if (data.longTapDragging) {
					ltTarget.onLongTapDrag();
				}
			})
			.on(end, function (e) {

				cancelLongTap();

				if (!moved &&
					(Date.now() - startTime < ltDelay) &&
					!C.currentCollection.inMomentum) {
					var target = C.currentCollection.getItem(+tapTarget.dataset.id);
					target.onTap();
					tapTarget = null;
					data = touch.data = {};
				}

				if (data.longTapDragging) {
					longTapDragging = false;
					ltTarget.onLongTapEnd();
					ltTarget = null;
					tapTarget = null;
					data = touch.data = {};
				}
			});
	}

	return touch;

}());
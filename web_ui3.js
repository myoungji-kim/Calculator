// ♬
let WebUI = {}

WebUI.WidgetTypes = {
    UNDEFINED:      "undefind",
    TEXT:           "text",
    IMAGE:          "image",
    PUSH_BUTTON:    "push_button",
    TEXT_FIELD:     "text_field",
    SWITCH:         "switch",
    
    // ADD NEW WIDGET TYPES HERE
    CONTAINER:      "container",
    ROW:            "row",
    COLUMN:         "column",
    GRIDVIEW:       "gridview", // NEW_3
    GRAPH:          "graph" // NEW_3
};

WebUI.Alignment = {
    // ADD ALIGNMENT TYPES HERE
    CENTER:         "center",
    LEFT:           "left",
    RIGHT:          "right",
    TOP:            "top",
    BOTTOM:         "bottom"
};

WebUI.widgets = [];
WebUI.focused_widget = null;
WebUI.dragged_widget = null;
WebUI.hovered_widget = null;

WebUI.is_mouse_dragging = false;       
WebUI.mouse_drag_start = {x:0, y:0};
WebUI.mouse_drag_prev = {x:0, y:0};



// ♬
WebUI.initialize = function() {
    this.canvas = new fabric.Canvas("c", {
        backgroundColor: 'white',
        hoverCursor: "default",
        selection: false,
        width: window.innerWidth,
        height: window.innerHeight
    });

    //
    $(document).keypress(function(event) {
        WebUI.handleKeyPress(event);
    });
    $(document).mousedown(function(event) {
        let p = {x: event.pageX, y: event.pageY};
        WebUI.handleMouseDown(p);
    });
    $(document).mouseup(function(event) {
        let p = {x: event.pageX, y: event.pageY};
        WebUI.handleMouseUp(p);
    });
    $(document).mousemove(function(event) {
        let p = {x: event.pageX, y: event.pageY};
        WebUI.handleMouseMove(p);
    });

    //
    WebUI.initWidgets();
    WebUI.initVisualItems();
    WebUI.layoutWhenResourceReady();
}


// ♬
WebUI.initVisualItems = function() {
    WebUI.widgets.forEach(widget => {
        widget.initVisualItems();
    });
}

// ♬
WebUI.layoutWhenResourceReady = function() {
    let is_resource_loaded = true;
    for (let i in WebUI.widgets) {
        let widget = WebUI.widgets[i];
        if (!widget.is_resource_ready) {
            is_resource_loaded = false;
            break;
        }
    }

    if (!is_resource_loaded) {
        setTimeout(arguments.callee, 50);
    }
    else {
        WebUI.app.layout();
        WebUI.canvas.requestRenderAll();
    }
}

// ♬
WebUI.handleKeyPress = function(event) {
    let is_handled = false;

    if (WebUI.focused_widget) {
        is_handled = WebUI.focused_widget.handleKeyPress(event) || is_handled;
    }

    if (is_handled) {
        WebUI.canvas.requestRenderAll();
    }
}

// ♬
WebUI.handleMouseDown = function(window_p) {
    let is_handled = false;

    if (WebUI.isInCanvas(window_p)) {
        let canvas_p = WebUI.transformToCanvasCoords(window_p);        

        WebUI.is_mouse_dragging = true;
        WebUI.mouse_drag_start = canvas_p;
        WebUI.mouse_drag_prev = canvas_p;

        let widget = WebUI.findWidgetOn(canvas_p);
        if (widget) {
            WebUI.focused_widget = widget;    

            if (widget.is_draggable) {
                WebUI.dragged_widget = widget;
            }
            else {
                WebUI.dragged_widget = null;
            }

            is_handled = widget.handleMouseDown(canvas_p) || is_handled;
        }
        else {
            WebUI.focused_widget = null;
            WebUI.dragged_widget = null;
        }
    }
    else {
        WebUI.is_mouse_dragging = false;
        WebUI.mouse_drag_start = {x:0, y:0};
        WebUI.mouse_drag_prev = {x:0, y:0};

        WebUI.focused_widget = null;
        WebUI.dragged_widget = null;
    }

    if (is_handled) {
        WebUI.canvas.requestRenderAll();
    }
}

// ♬
WebUI.handleMouseMove = function(window_p) {
    let canvas_p = WebUI.transformToCanvasCoords(window_p);
    let is_handled = false;

    let widget = WebUI.findWidgetOn(canvas_p);
    if (widget != WebUI.hovered_widget) {
        if (WebUI.hovered_widget != null) {
            is_handled = WebUI.hovered_widget.handleMouseExit(canvas_p) || is_handled;
        }
        if (widget != null) {
            is_handled = widget.handleMouseEnter(canvas_p) || is_handled;
        }
        WebUI.hovered_widget = widget;
    }
    else {
        if (widget) {
            is_handled = widget.handleMouseMove(canvas_p) || is_handled;
        }
    }

    if (WebUI.is_mouse_dragging) {
        if (WebUI.dragged_widget != null) {
            let tx = canvas_p.x - WebUI.mouse_drag_prev.x;
            let ty = canvas_p.y - WebUI.mouse_drag_prev.y;
            WebUI.dragged_widget.translate({x: tx, y: ty});

            is_handled = true;
        }
        WebUI.mouse_drag_prev = canvas_p;
    }

    if (is_handled) {
        WebUI.canvas.requestRenderAll();
    }
}

// ♬
WebUI.handleMouseUp = function(window_p) {
    let is_handled = false;
    let canvas_p = WebUI.transformToCanvasCoords(window_p);

    let widget  = WebUI.findWidgetOn(canvas_p);
    if (widget) {
        is_handled = widget.handleMouseUp(canvas_p) || is_handled;
    }

    if (WebUI.is_mouse_dragging) {
        WebUI.is_mouse_dragging = false;
        WebUI.mouse_drag_start = {x:0, y:0};
        WebUI.mouse_drag_prev = {x:0, y:0};

        WebUI.dragged_widget = null;
        
        is_handled = true;
    }

    if (is_handled) {
        WebUI.canvas.requestRenderAll();
    }
}

// ♬
WebUI.transformToCanvasCoords = function(window_p) {
    let rect = WebUI.canvas.getElement().getBoundingClientRect();
    let canvas_p = {
        x : window_p.x - rect.left,
        y : window_p.y - rect.top
    };
    return canvas_p;
}

// ♬
WebUI.isInCanvas = function(window_p) {
    let rect = WebUI.canvas.getElement().getBoundingClientRect();
    if (window_p.x >= rect.left && 
        window_p.x < rect.left + rect.width &&
        window_p.y >= rect.top && 
        window_p.y < rect.top + rect.height) {
        return true;
    }
    else {
        return false;
    }
}

// ♬
WebUI.findWidgetOn = function(canvas_p) {
    let x = canvas_p.x;
    let y = canvas_p.y;

    for (let i=0; i < this.widgets.length; i++) {
        let widget = this.widgets[i];

        if (x >= widget.position.left &&
            x <= widget.position.left + widget.size.width &&
            y >= widget.position.top &&
            y <= widget.position.top + widget.size.height) {
            return widget;
        }               
    }
    return null;
}

// ♬
WebUI.maxSize = function(size1, size2) {
    // IMPLEMENT HERE!
    let max_size = {width: 0, heigth: 0};

    max_size.width  = (size1.width  > size2.width)  ? size1.width  : size2.width ;
    max_size.height = (size1.height > size2.height) ? size1.height : size2.height;

    return max_size;
}

// ♬
WebUI.minSize = function(size1, size2) {
    // IMPLEMENT HERE!
    let min_size = {width: 0, height: 0};

    min_size.width = (size1.width  < size2.width)  ? size1.width  : size2.width ;
    min_size.width = (size1.height < size2.height) ? size1.height : size2.height;

    return min_size;
}

// ♬
// WebUI.Widget
WebUI.Widget = function(properties) {
    this.type = WebUI.WidgetTypes.UNDEFINED;
    
    this.is_draggable = false;
    this.is_movable = true;

    //
    this.parent = null;
    this.children = [];
    
    //
    this.position = {left: 0, top: 0};
    this.size = {width: 0, height: 0};

    //
    this.visual_items = [];
    this.is_resource_ready = false;

    //
    WebUI.widgets.push(this);

    // IMPLEMENT HERE: code for adding properties
    // 07-p.35
    if(properties != undefined) {
        for(let name in properties) {
            let value = properties[name];

            if(name == 'children') {
                value.forEach(child => {
                    child.parent = this;
                    this.children.push(child);
                })
            }
            else {
                this[name] = value;
            }
        }
    }

    // 기본값 설정
    this.initDefaultProperty();
}


// ♬
WebUI.Widget.prototype.setDefaultProperty = function(name, value) {
    if (this[name] == undefined) {
        this[name] = value;
    }
}

// ♬
WebUI.Widget.prototype.getBoundingRect = function() {
    return {
        left:   this.position.left, 
        top:    this.position.top,
        width:  this.size.width,
        height: this.size.height
    };
}

// ♬
WebUI.Widget.prototype.layout = function() {
    // IMPLEMENT HERE! p.37
    this.measure();
    this.arrange(this.position); //top-down으로 배치
}

// ♬
WebUI.Widget.prototype.measure = function() {
    // IMPLEMENT HERE! p.38
    if(this.children.length > 0) {
        this.size_children = {width: 0, height: 0};
        this.children.forEach(child => {
            let size_child = child.measure();
            this.size_children = this.extendSizeChildren(this.size_children, size_child);
        });
        this.size = WebUI.maxSize(this.desired_size, this.size_children);
    }
    else {
        this.size.width += this.padding * 2;
        this.size.height += this.padding * 2;
    }
    return this.size;
}
 
 // ♬
WebUI.Widget.prototype.arrange = function(position) {
    // IMPLEMENT HERE! p.40
    // arrange this
    this.moveTo(position);
    this.visual_items.forEach(item => { WebUI.canvas.add(item); });

    // arrange children
    if (this.children.length > 0) {
        let left_spacing = 0, top_spacing = 0;

        if (this.size.width > this.size_children.width) {
            let room_width = this.size.width - this.size_children.width;

            if (this.horizontal_alignment == WebUI.Alignment.LEFT)
                left_spacing = this.padding;
            else if (this.horizontal_alignment == WebUI.Alignment.CENTER)
                left_spacing = this.padding + room_width / 2.0;
            else if (this.horizontal_alignment == WebUI.Alignment.RIGHT)
                left_spacing = this.padding + room_width;  
        }

        if (this.size.height > this.size_children.height) {
            let room_height = this.size.height - this.size_children.height;

            if (this.vertical_alignment == WebUI.Alignment.TOP)
                top_spacing = this.padding;
            else if (this.vertical_alignment == WebUI.Alignment.CENTER)
                top_spacing = this.padding + room_height / 2.0;
            else if (this.vertical_alignment == WebUI.Alignment.BOTTOM)
                top_spacing = this.padding + room_height;
        }

        let next_position = {left: position.left + left_spacing, top: position.top + top_spacing}; // margin 추가
        this.children.forEach(child => {
            child.arrange(next_position);
            next_position = this.calcNextPosition(next_position, child.size);
        });
    }
}

// ♬
// default implementation that is expected to be overridden
// ★ p.42
WebUI.Widget.prototype.extendSizeChildren = function(size, child_size) {
    if (size.width  < child_size.width)     size.width = child_size.width;
    if (size.height < child_size.height)    size.height = child_size.height;

    return size;
}

// ♬
// default implementation that is expected to be overridden
WebUI.Widget.prototype.calcNextPosition = function(position, size) {
    let next_left = position.left + size.width;
    let next_top = position.top;

    return {left: next_left, top: next_top};
}

// ♬
WebUI.Widget.prototype.initVisualItems = function() {
    this.is_resource_ready = true;
    return true;
}

// ♬
WebUI.Widget.prototype.moveTo = function(p) {
    if(!this.is_movable)
    {
        return;
    }

    let tx = p.left - this.position.left;
    let ty = p.top - this.position.top;

    this.translate({x: tx, y: ty});
}

// ♬
WebUI.Widget.prototype.translate = function(v) {
    if(!this.is_movable)
    {
        return;
    }

    this.position.left += v.x;
    this.position.top += v.y;

    this.visual_items.forEach(item => {
        item.left += v.x;
        item.top += v.y;
    });

    this.children.forEach(child_widget => {
        child_widget.translate(v);
    });
}

// ♬
WebUI.Widget.prototype.destroy = function() {
    if (this == WebUI.focused_widget) WebUI.focused_widget = null;
    if (this == WebUI.dragged_widget) WebUI.dragged_widget = null;
    if (this == WebUI.hovered_widget) WebUI.hovered_widget = null;

    this.visual_items.forEach(item => {
        WebUI.canvas.remove(item);
    });
    this.visual_items = [];
    
    let index = WebUI.widgets.indexOf(this);
    if(index > -1)
    {
        WebUI.widgets.splice(index, 1);
    }

    this.children.forEach(child_widget => {
        child_widget.destroy();
    });
    this.children = [];
}

WebUI.Widget.prototype.handleKeyPress = function(event) {
    return false;
}

WebUI.Widget.prototype.handleMouseDown = function(canvas_p) {
    return false;
}

WebUI.Widget.prototype.handleMouseMove = function(canvas_p) {
    return false;
}

WebUI.Widget.prototype.handleMouseUp = function(canvas_p) {
    return false;
}

WebUI.Widget.prototype.handleMouseEnter = function(canvas_p) {
    return false;
}

WebUI.Widget.prototype.handleMouseExit = function(canvas_p) {
    return false;
}

WebUI.Widget.prototype.handleResize = function() {
    return false;
}

// ♬
WebUI.Container = function(properties) {
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.CONTAINER;
}

WebUI.Container.prototype = Object.create(WebUI.Widget.prototype);
WebUI.Container.prototype.constructor = WebUI.Container;

// NEW_3 ♬
WebUI.Container.prototype.initVisualItems = function() { 
    let boundary = new fabric.Rect({
        width:          this.desired_size.width,
        height:         this.desired_size.height,
        left:           this.position.left,
        top:            this.position.top,
        selectable:     false,
        fill:           this.fill_color,
        stroke:         this.stroke_color,
        strokeWidth:    this.stroke_width,
    });

    this.visual_items.push(boundary);
    this.is_resource_ready = true;
}

// ♬
WebUI.Container.prototype.extendSizeChildren = function(size, child_size) {
    // IMPLEMENT HERE! p.45
    if (size.width < child_size.width) size.width = child_size.width;
    if (size.height < child_size.height) size.height = child_size.height;
    return size;
}

// ♬
WebUI.Container.prototype.calcNextPosition = function(position, size) {
    // IMPLEMENT HERE! p.45
    let next_left = position.left;
    let next_top = position.top;
    return {left: next_left, top: next_top};
}

// ♬
WebUI.Column = function(properties) {
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.COLUMN;
}

WebUI.Column.prototype = Object.create(WebUI.Widget.prototype);
WebUI.Column.prototype.constructor = WebUI.Column;

// NEW_3 ♬
WebUI.Column.prototype.initVisualItems = function() { 
    let boundary = new fabric.Rect({
        width:          this.desired_size.width,
        height:         this.desired_size.height,
        left:           this.position.left,
        top:            this.position.top,
        selectable:     false,
        fill:           this.fill_color,
        stroke:         this.stroke_color,
        strokeWidth:    this.stroke_width,
    });

    this.visual_items.push(boundary);
    this.is_resource_ready = true;
}

// ♬
WebUI.Column.prototype.extendSizeChildren = function(size, child_size) {
    // IMPLEMENT HERE! p.48
    size.width += child_size.width;
    if (size.height < child_size.height) size.height = child_size.height;
    return size;
}

// ♬
WebUI.Column.prototype.calcNextPosition = function(position, size) {
    // IMPLEMENT HERE!
    let next_left = position.left + size.width; 
    let next_top  = position.top;
    return { left: next_left, top: next_top };
}


// ♬
WebUI.Row = function(properties) {
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.ROW;
}

WebUI.Row.prototype = Object.create(WebUI.Widget.prototype);
WebUI.Row.prototype.constructor = WebUI.Row;

// NEW_3 ♬
WebUI.Row.prototype.initVisualItems = function() { 
    let boundary = new fabric.Rect({
        width:          this.desired_size.width,
        height:         this.desired_size.height,
        left:           this.position.left,
        top:            this.position.top,
        selectable:     false,
        fill:           this.fill_color,
        stroke:         this.stroke_color,
        strokeWidth:    this.stroke_width,
    });

    this.visual_items.push(boundary);
    this.is_resource_ready = true;
}

// ♬
WebUI.Row.prototype.extendSizeChildren = function(size, child_size) {
    // IMPLEMENT HERE! p.47
    if(size.width < child_size.width) size.width = child_size.width;
    size.height += child_size.height;
    return size;
}

// ♬
WebUI.Row.prototype.calcNextPosition = function(position, size) {
    // IMPLEMENT HERE! p.47
    let next_left = position.left;
    let next_top  = position.top + size.height; // margin 추가
    return { left: next_left, top: next_top };
}


// ♬
// Image widget
WebUI.Image = function(path, desired_size) {
    WebUI.Widget.call(this);

    this.type = WebUI.WidgetTypes.IMAGE;
    this.path = path;
    this.desired_size = desired_size;
}

WebUI.Image.prototype = Object.create(WebUI.Widget.prototype);
WebUI.Image.prototype.constructor = WebUI.Image;

WebUI.Image.prototype.initVisualItems = function() {
    // COPY HERE!
    let widget = this;

    fabric.Image.fromURL(this.path, function(img){
        if (widget.desired_size != undefined) {
                img.scaleToWidth(widget.desired_size.width);
                img.scaleToHeight(widget.desired_size.height);
                widget.size = widget.desired_size;
        }
        else {
                widget.size = { width:  img.width,
                                height: img.height };
        }
        img.set({left: widget.position.left,
                 top:  widget.position.top,
                 selectable: false });

        widget.visual_items.push(img);
        widget.is_resource_ready = true;
    });
}


// PushButton widget
WebUI.PushButton = function(label, desired_size, properties) { // NEW_3 -> properties
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.PUSH_BUTTON;
    this.label = label;       
    this.desired_size = desired_size;
    this.is_pushed = false;
    this.font_family = 'Noto Sans KR';
}

WebUI.PushButton.prototype = Object.create(WebUI.Widget.prototype);
WebUI.PushButton.prototype.constructor = WebUI.PushButton;
// ♬
WebUI.PushButton.prototype.initVisualItems = function() {
    let background = new fabric.Rect({
        left: this.position.left,
        top: this.position.top,
        width: this.desired_size.width,
        height: this.desired_size.height,
        fill: this.fill_color,
        stroke: this.stroke_color,
        strokeWidth: 1,
        selectable: false
    });

    let text = new fabric.Text(this.label, {
        left: this.position.left,
        top: this.position.top,
        selectable: false,
        fontFamily: this.font_family,
        fontSize:   this.font_size,
        fontWeight: this.font_weight,
        textAlign:  this.text_align,
        stroke:     this.text_color,
        fill:       this.text_color,
    });

    let bound = text.getBoundingRect();
    text.left = this.position.left + this.desired_size.width/2  - bound.width/2;
    text.top  = this.position.top  + this.desired_size.height/2 - bound.height/2;

    this.size = this.desired_size;

    //
    this.visual_items.push(background);
    this.visual_items.push(text);
    this.is_resource_ready = true;
}

// ♬
WebUI.PushButton.prototype.handleMouseDown = function() {
    // COPY HERE!
    if (!this.is_pushed) {
        this.translate({x:0, y:5});
        this.is_pushed = true;

            if (this.onPushed != undefined) {
                    this.onPushed.call(this);
            }
        return true;
    }
    else {
            return false;
    }
}

// ♬
WebUI.PushButton.prototype.handleMouseUp = function() {
    // COPY HERE!
    if (this.is_pushed){
            this.translate({x:0, y:-5});
            this.is_pushed = false;

            return true;
    }
    else {
            return false;
    }
}

// ♬
WebUI.PushButton.prototype.handleMouseEnter = function() {
    // COPY HERE!
    this.visual_items[0].set('strokeWidth',2);
    return true;
}

// ♬
WebUI.PushButton.prototype.handleMouseExit = function() {
    // COPY HERE!
    this.visual_items[0].set('strokeWidth',1);

    if (this.is_pushed){
            this.translate({x:0, y:-5});
            this.is_pushed = false;
    }
    return true;
}

// ♬
// TextField widget
WebUI.TextField = function(label, desired_size) {
    WebUI.Widget.call(this);

    this.type         = WebUI.WidgetTypes.TEXT_FIELD;
    this.label        = label;
    this.desired_size = desired_size;
    this.margin       = 10;

    this.stroke_color = '#32479e';
    this.fill_color   = 'white';
    this.stroke_width = 5;    

}

WebUI.TextField.prototype = Object.create(WebUI.Widget.prototype);
WebUI.TextField.prototype.constructor = WebUI.TextField;

// ♬
WebUI.TextField.prototype.initVisualItems = function() {
    // COPY HERE!
    let boundary = new fabric.Rect({
            left:         this.position.left,
            top:          this.position.top,
            width:        this.desired_size.width,
            height:       this.desired_size.height,
            fill:         this.fill_color,
            stroke:       this.stroke_color,
            strokeWidth:  this.stroke_width,
            selectable:   false
    });

    let textbox = new fabric.Textbox(this.label, {
            left:        this.position.left + this.margin, // 수정
            fontFamily:  this.font_family,
            fontSize:    this.font_size,
            fontWeight:  this.font_weight,
            textAlign:   this.text_align,
            stroke:      this.text_color,
            fill:        this.text_color,
            selectable:  false
    });

    let bound = textbox.getBoundingRect();
    textbox.top = this.position.top +
                (this.desired_size.height - bound.height)/2;

    this.size = this.desired_size;

    this.visual_items.push(boundary);
    this.visual_items.push(textbox);

    this.is_resource_ready = true;
}

// ♬
WebUI.TextField.prototype.handleMouseDown = function(canvas_p) {
    let textbox = this.visual_items[1];        
    textbox.enterEditing();

    return true;
}

// ♬
WebUI.TextField.prototype.handleKeyPress = function(event) {
    let boundary = this.visual_items[0];
    let textbox = this.visual_items[1];        
    let new_label = textbox.text;
    let old_label = this.label;
    this.label = new_label;

    if (event.keyCode == 13) {
        let text_enter_removed = new_label.replace(/(\r\n|\n|\r)/gm, "");
        textbox.text = text_enter_removed;
        this.label = text_enter_removed;
        
        if (textbox.hiddenTextarea != null) {
            textbox.hiddenTextarea.value = text_enter_removed;
        }

        textbox.exitEditing();

        return true;    
    }

    if (old_label != new_label && old_label.length < new_label.length) {
        let canvas = document.getElementById("c");
        let context = canvas.getContext("2d");
        context.font = this.font_size.toString() + "px " + this.font_family;

        let boundary_right = boundary.left + boundary.width - this.margin;
        let text_bound = textbox.getBoundingRect();
        let text_width = context.measureText(new_label).width;
        let text_right = text_bound.left + text_width;

        if (boundary_right < text_right) {
            textbox.text = old_label;
            this.label = old_label;
            
            if (textbox.hiddenTextarea != null) {
                textbox.hiddenTextarea.value = old_label;
            }

            return true;
        }
    }
    
    return false;
}

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////


WebUI.app = null;
WebUI.parser = math.parser(); // NEW_2

WebUI.initWidgets = function() {
    // INITIALIZE WIDGETS HERE
    const trigonometricButtonFillColor = '#91aace';
    const complexButtonFillColor = '#c0d0e6';
    const constFillButtons = '#d3e1ee';
    const funcFillButtons = '#ebeff8';
    const numFillButtons = '#f1f3f4';
    const symbolGrayFillButtons = '#dadce0';
    const symbolRedFillButtons = '#ecba99';
    const symbolBrownFillButtons = '#afa198';
    const symbolYellowFillButtons = '#f1dbb6';

    const numStrokeButtons = '#a5a9ad';
    const symbolGrayStrokeButtons = '#94989b';
    const symbolRedStrokeButtons = '#dd8657';
    const symbolBrownStrokeButtons = '#897263';
    const symbolYellowStrokeButtons = '#eac398';

    const symbolTextFillButtons = '#292f35';

    const stroke_width = 3;

    const width = 50;
    const height = 45;


    const trigonometricButtons = [
        new WebUI.CalcButton("sin", "sin(", {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("cos", "cos(", {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("tan", "tan(", {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("arc", "a", {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}),

        new WebUI.CalcButton("csc", "csc(", {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("sec", 'sec(', {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}),
        new WebUI.CalcButton("cot", 'cot(', {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("h",   'h(',  {width, height}, {stroke_width, fill_color: trigonometricButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}),
    ];

    const complexButtons = [
        new WebUI.CalcButton("arg",  'arg(', {width, height}, {stroke_width, fill_color: complexButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("conj", 'conj(',{width, height}, {stroke_width, fill_color: complexButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("im",   'im(',  {width, height}, {stroke_width, fill_color: complexButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("re",   're(',  {width, height}, {stroke_width, fill_color: complexButtonFillColor, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
    ]

    const constButtons = [
        new WebUI.CalcButton("2^x",  '2^(',   {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("10^x", '10^(',  {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("e^x",  'e^(',   {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("pow",  '^',    {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 

        new WebUI.CalcButton("log2", 'log2(' , {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("log10",'log10(', {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("ln",   'ln('   , {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("log",  'log('  , {width, height}, {stroke_width, fill_color: constFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
    ]

    const funcButtons = [
        new WebUI.CalcButton("w", "w",{width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("x", "x",{width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("y", "y",{width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("z", "z",{width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 

        new WebUI.CalcButton("f",    "f", {width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("g",    "g", {width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("f(x)", "f(x)", {width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
        new WebUI.CalcButton("plot", "plot", {width, height}, {stroke_width, fill_color: funcFillButtons, text_color: symbolTextFillButtons, stroke_color: '#b4bbd6'}), 
    ]

    const numButtons = [
        new WebUI.CalcButton("<",  "<", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton(">",  ">", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("<=", "<=", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton(">=", ">=", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("==", "==", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("!=", "!=", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}),

        new WebUI.CalcButton("n!", "!", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("|x|","abs(", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("(",  "(", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton(")",  ")", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}),
        new WebUI.CalcButton("[",  "[", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("]",  "]", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}),

        new WebUI.CalcButton("%",    "%", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("inv",  "inv(", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("cross","cross(", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("det",  "det(", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton(":",    ":", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton(";",    ";", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}),

        new WebUI.CalcButton("sqrt", "sqrt(",{width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("1",    "1",  {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("2",    "2",  {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("3",    "3",  {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("+",    "+",  {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("x",    "*",  {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}),

        new WebUI.CalcButton("i",    "i", {width, height}, {stroke_width, fill_color: symbolRedFillButtons, stroke_color: symbolRedStrokeButtons}), 
        new WebUI.CalcButton("4",    "4", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("5",    "5", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("6",    "6", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("-",    "-", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 
        new WebUI.CalcButton("÷",    "/", {width, height}, {stroke_width, fill_color: symbolGrayFillButtons, stroke_color: symbolGrayStrokeButtons}), 

        new WebUI.CalcButton("e",    "e", {width, height}, {stroke_width, fill_color: symbolRedFillButtons, stroke_color: symbolRedStrokeButtons}), 
        new WebUI.CalcButton("7",    "7", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("8",    "8", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("9",    "9", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton("=",    "=", {width, height}, {stroke_width, fill_color: symbolBrownFillButtons, text_color: '#f7f3f0', font_weight:200, 
                                                            stroke_color:symbolBrownStrokeButtons}), 
        new WebUI.CalcButton("CL",   "CL",{width, height}, {stroke_width, fill_color: symbolBrownFillButtons, text_color: '#f7f3f0', font_weight:200, 
                                                            stroke_color:symbolBrownStrokeButtons}),
        
        new WebUI.CalcButton("π",    "pi", {width, height}, {stroke_width, fill_color: symbolRedFillButtons, stroke_color: symbolRedStrokeButtons}), 
        new WebUI.CalcButton(".",    ".", {width, height}, {stroke_width, fill_color: symbolYellowFillButtons, stroke_color: symbolYellowStrokeButtons}), 
        new WebUI.CalcButton("0",    "0", {width, height}, {stroke_width, fill_color: numFillButtons, stroke_color: numStrokeButtons}), 
        new WebUI.CalcButton(",",    ",", {width, height}, {stroke_width, fill_color: symbolYellowFillButtons, stroke_color: symbolYellowStrokeButtons}), 
        new WebUI.CalcButton("◀",   "◀", {width, height}, {stroke_width, fill_color: symbolBrownFillButtons, text_color: '#f7f3f0', font_weight:200, stroke_color:symbolBrownStrokeButtons}), 
        new WebUI.CalcButton("EV",  "EV", {width, height}, {stroke_width, fill_color: symbolBrownFillButtons, text_color: '#f7f3f0', font_weight:200, stroke_color:symbolBrownStrokeButtons}),
    ];


    WebUI.currentText = '0'; // NEW_2

    WebUI.app = new WebUI.Row({
        desired_size: {width: 700, height: 650},
        position: {left: 10, top: 10},

        stroke_width: 0,
        children: [ 
            new WebUI.Container({ // WebUI.app.children[0]
                desired_size: {width: 650, height: 60},
                horizontal_alignment: WebUI.Alignment.CENTER,
                vertical_alignment:   WebUI.Alignment.CENTER,
                stroke_width: 0,
                children: [ 
                        new WebUI.Text("WebUI Calculator (공학용 계산기)", // WebUI.app.children[0].children[0]
                        {font_family: 'Noto Sans KR', font_size: 24, font_weight:400, text_color:'#32479e'})],
            }),

            new WebUI.Column({ // 결과값이랑 그래프 보이는 곳  // WebUI.app.children[1]
                desired_size: {width: 700, height: 155},
                horizontal_alignment: WebUI.Alignment.LEFT,
                vertical_alignment:   WebUI.Alignment.TOP,

                fill_color: 'white',
                stroke_width: 0,

                children: [ 
                    new WebUI.Container({ // WebUI.app.children[1].children[0] // 그래프
                        desired_size: {width:240, height:140},
                        horizontal_alignment: WebUI.Alignment.LEFT,
                        vertical_alignment  : WebUI.Alignment.Top,

                        fill_color: 'white',
                        stroke_width: 0,

                        children: [ 
                                new WebUI.Graph({width: 231, height: 140}, {stroke_color: '#32479e', stroke_width: 1}),
                                // WebUI.app.children[1].children[0].children[0]
                        ]
                    }),
                    new WebUI.Container({ // WebUI.app.children[1].children[1] // 결과값
                        desired_size: {width:350, height: 140},

                        horizontal_alignment: WebUI.Alignment.LEFT,
                        vertical_alignment  : WebUI.Alignment.Top,

                        fill_color: 'white',
                        stroke_width: 0,

                        children: [ 
                            new WebUI.Text("0", {width: 350, height: 140})
                            // WebUI.app.children[1].children[1].children[0]
                        ]
                    }),
                    
                ]
            }),

            new WebUI.Column({ // 자판 버튼 나오는 곳 // WebUI.app.children[2]
                desired_size: {width: 700, height: 400},
                horizontal_alignment: WebUI.Alignment.LEFT,
                stroke_width: 0,
                children: [
                    new WebUI.Row({
                        stroke_width: 0,
                        children: [
                            new WebUI.GridView(4, {
                                desired_size: {width: 240, height: 100},
                                stroke_width: 0,
                                children: trigonometricButtons
                            }),
                            new WebUI.GridView(4, {
                                desired_size: {width: 231, height: 45},
                                stroke_width: 0,
                                children: complexButtons
                            }),
                            new WebUI.GridView(4, {
                                desired_size: {width: 231, height: 100},
                                stroke_width: 0,
                                children: constButtons
                            }),
                            new WebUI.GridView(4, {
                                desired_size: {width: 231, height: 100},                                
                                stroke_width: 0,
                                children: funcButtons
                            })
                        ]
                    }),
                    new WebUI.GridView(6, {
                        horizontal_alignment: WebUI.Alignment.LEFT,
                        stroke_width: 0,
                        desired_size: {width: 380, height: 375},
                        children: numButtons
                    }),
                ]
            })
        ]
    });
}


WebUI.Widget.prototype.initDefaultProperty = function()
{
    this.setDefaultProperty('stroke_width', 1);
    this.setDefaultProperty('desired_size', {width: 0, height: 0});
    this.setDefaultProperty('text_align', 'left');
    this.setDefaultProperty('font_family', 'Noto Sans KR');
    this.setDefaultProperty('font_size', 18);
    this.setDefaultProperty('font_weight', 300);
    this.setDefaultProperty('stroke_color', '#32479e');
    this.setDefaultProperty('fill_color', 'white');
    this.setDefaultProperty('text_color', '#3d3d3d');
    this.setDefaultProperty('padding', 5);
    this.setDefaultProperty('margin', 5);
    this.setDefaultProperty('horizontal_alignment', WebUI.Alignment.LEFT);
    this.setDefaultProperty('vertical_alignment', WebUI.Alignment.TOP);
}

// NEW_3
// Text widget
WebUI.Text = function(label, properties) {
    // COPY HERE!
    WebUI.Widget.call(this, properties);

    this.type  = WebUI.WidgetTypes.TEXT; 
    this.label = label;
}

WebUI.Text.prototype = Object.create(WebUI.Widget.prototype); 
WebUI.Text.prototype.constructor = WebUI.Text; 

WebUI.Text.prototype.initVisualItems = function() { 
    // COPY HERE!
    let text = new fabric.Text(this.label, {
                left:       this.position.left,
                top:        this.position.top,
                selectable: false,
                fontFamily: this.font_family,
                fontSize:   this.font_size,
                fontWeight: this.font_weight,
                textAlign:  this.text_align,
                stroke:     this.text_color,
                fill:       this.text_color
    });

    let bound = text.getBoundingRect(); 
    this.position.left = bound.left;
    this.position.top  = bound.top;
    this.size.width    = bound.width;
    this.size.height   = bound.height;


    // NEW_3
    if(this.width != undefined) {
        let boundary = new fabric.Rect({
            left:           this.position.left,
            top:            this.position.top,
            selectable:     false,
            width:          this.width,
            height:         this.height,
            fill:           this.fill_color,
            stroke:         this.stroke_color,
            strokeWidth:    this.stroke_width,
        });

        text.set('left', this.position.left + this.margin);
        text.set('top', this.position.top + (this.height - bound.height)/2);
        
        this.visual_items.push(boundary);
    }
    this.visual_items.push(text);
    this.is_resource_ready = true; // 
}

// New_3 @@@@@
WebUI.Text.prototype.setLabel = function(new_label) {
    let text;
    if(this.visual_items.length != 1)
        text = this.visual_items[1];
    else
        text = this.visual_items[0];

    text.set('text', new_label); 

    let canvas = document.getElementById("c");
    let context = canvas.getContext("2d");
    context.font = this.font_size.toString() + "px " + this.font_family;

    let boundary_right = (this.parent.position.left + this.parent.desired_size.width) - this.margin;
    let text_width = context.measureText(new_label).width;
    let text_right = this.position.left + text_width;

    text.fontSize = 25;
    if(boundary_right < text_right) {
        text.fontSize = 18;
    } //

    this.label = new_label;

    WebUI.canvas.requestRenderAll();
}


// NEW_3
// CalcButton ★
WebUI.CalcButton = function(label, printText, desired_size, properties) {
    WebUI.PushButton.call(this, label, desired_size, properties); 

    this.type      = WebUI.WidgetTypes.CalcButton;
    this.onPushed  = this.handleButtonPushed;
    this.printText = printText;
}

WebUI.CalcButton.prototype = Object.create(WebUI.PushButton.prototype);
WebUI.CalcButton.prototype.constructor = WebUI.CalcButton;


// 계산기 구현
WebUI.CalcButton.prototype.handleButtonPushed = function() {
    var showLabel = WebUI.app.children[1].children[1].children[0];  
    if (WebUI.currentText == '0') 
        WebUI.currentText = '';

    let makeLogWithBase = function() {
        let x = WebUI.currentText.split('(')[1].split(')')[0];  
        let base;
    
        if (WebUI.currentText.substr(0, 2) == "ln")         base = 'e';
        else if (WebUI.currentText.substr(0, 4) == "log2")  base = '2';
        else if (WebUI.currentText.substr(0, 5) == "log10") base = '10';
        else if (WebUI.currentText.split(',').length == 1)  base = '10';
        else
            base = WebUI.currentText.split(',')[1].split(')')[0];

        WebUI.currentText = `log(${x},${base})`;
    }

    // NEW_3
    if(this.label == "EV") {
        try {
            if(WebUI.currentText.substring(0, 2) == "ln" 
                || WebUI.currentText.substring(0, 3) == "log") {
                makeLogWithBase();
            }
            WebUI.currentText = WebUI.parser.eval(WebUI.currentText).toString();
            var block  = WebUI.currentText.split(' ');
            if(block [0] == 'function') {
                WebUI.currentText = block [0];
            }
            showLabel.setLabel(WebUI.currentText);
            WebUI.currentText = '0';
        }
        catch(e) {
            WebUI.currentText = '0';
            if(WebUI.currentText != 'function') {
                showLabel.setLabel(e.toString());
            }
        }
    }
    else if(this.label == "plot") {
            WebUI.Graph.prototype.drawGraph();
    }
    else if(this.label == "◀") {
            WebUI.currentText = WebUI.currentText.slice(0, -1);
            if(WebUI.currentText == "") 
                WebUI.currentText = "0";
            showLabel.setLabel(WebUI.currentText);
    }
    else if(this.label == "CL"){
        WebUI.currentText = "0"
        showLabel.setLabel(WebUI.currentText);
    }
    else {
            WebUI.currentText += this.printText;
            showLabel.setLabel(WebUI.currentText);
        }
    }



// NEW_3
// GridView 생성자
WebUI.GridView = function(col, properties) {
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.GRIDVIEW;
    this.col = col;    
    this.row = 0;

    let row = this.children.length / this.col;

    this.widths = new Array(row).fill(0);

    this.excel = new Array();
    for(let i = 0; i < row; i++)
    {
        let arrayRow = new Array();
        for(let j = 0; j < this.col; j++){
            arrayRow.push(this.children[j + (i * this.col)]);
        }
        this.excel.push(arrayRow);
    }
}

WebUI.GridView.prototype = Object.create(WebUI.Widget.prototype);
WebUI.GridView.constructor = WebUI.GridView;

WebUI.GridView.prototype.initVisualItems = function() {
    let boundary = new fabric.Rect({
        left:           this.position.left,
        top:            this.position.top,
        selectable:     false,
        width:          this.desired_size.width,
        height:         this.desired_size.height,
        fill:           this.fill_color,
        stroke:         this.stroke_color,
        strokeWidth:    this.stroke_width,
    });

    this.visual_items.push(boundary);
    this.is_resource_ready = true;
}

WebUI.GridView.prototype.extendSizeChildren = function(size, child_size) {
    if ((this.row % this.col) != 0) {
        let width = this.widths[parseInt(this.row/this.col)];
        width += child_size.width;
        size.height = Math.max(size.height, child_size.height);

        size.width = Math.max(width, size.width);
        this.widths[parseInt((this.row + 1)/this.col)] = width;
    }
    else {
        size.width = Math.max(size.width, child_size.width);
        size.height += child_size.height;

        this.widths[parseInt(this.row/this.col)] = child_size.width;
    }
    this.row++;
    if(this.row == this.children.length)
        this.row = 0;
    
    return size;
}

WebUI.GridView.prototype.calcNextPosition = function(position, size) {
    let next_left, next_top;

    if (((this.row + 1) % this.col) != 0) {
        next_left = position.left + size.width;
        next_top = position.top;
    } else {
        let max_height = 0;
        let pivot = this.excel[parseInt(((this.row+1)/this.col-1))];
        next_left = this.children[0].position.left;
        for(let i = 0; i < this.col; i++) {
            max_height = Math.max(pivot[i].size.height, max_height);
        }
        next_top = position.top + max_height;
    }
    this.row++;
    if (this.row == this.children.length)
        this.row = 0;

    return {
        left: next_left,
        top: next_top
    };
}

// NEW_3
WebUI.Graph = function(desired_size, properties) {
    WebUI.Widget.call(this, properties);

    this.type = WebUI.WidgetTypes.GRAPH;
    this.desired_size = desired_size;
    this.scale = 20; // -10 ~ +10
}

WebUI.Graph.prototype = Object.create(WebUI.Widget.prototype);
WebUI.Graph.prototype.constructor = WebUI.Graph;

WebUI.Graph.prototype.initVisualItems = function() {
    let background = new fabric.Rect({
        left:   this.position.left,
        top:    this.position.top,
        width:  this.desired_size.width,
        height: this.desired_size.height,
        fill:   this.fill_color,
        stroke: this.stroke_color,
        strokeWidth: this.stroke_width,
        selectable:  false
    });

    const axisColor = '#EEEEEE';

    let xMidLine = [
        this.position.left, this.position.top + this.desired_size.height/2,
        this.position.left + this.desired_size.width, this.position.top  + this.desired_size.height/2
    ];

    let yCenterLine = [
        this.position.left + this.desired_size.width/2, this.position.top,
        this.position.left + this.desired_size.width/2, this.position.top + this.desired_size.height
    ];


    let xAxis = new fabric.Line(xMidLine, {
        stroke: axisColor,
        strokeWidth : 1,
        selectable: false,
    });

    let yAxis = new fabric.Line(yCenterLine, {
        stroke: '#E2E2E2',
        strokeWidth : 1,
        selectable: false,
    })


    graphLine = "";

    let graphDraw = new fabric.Path(graphLine, {
        path:           graphLine,
        width:          this.desired_size.width,
        height:         this.desired_size.height,
        fill:           '',
        stroke:         this.stroke_color,
        strokeWidth:    1,
        selectable:     false,
    });

    graphDraw.setCoords();
    this.visual_items.push(background);
    this.visual_items.push(xAxis);
    this.visual_items.push(yAxis);
    this.visual_items.push(graphDraw);
    this.is_resource_ready = true;
}

WebUI.Graph.prototype.drawGraph = function() {
    let plane = WebUI.app.children[1].children[0].children[0];
    // console.log(plane);
    let x0 = plane.position.left + plane.desired_size.width /2; // x좌표 원점
    let y0 = plane.position.top  + plane.desired_size.height/2; // y좌표 원점

    let xLocation, yLocation;
    let iMax = Math.round( (plane.desired_size.width/2));
    let iMin = Math.round(-(plane.desired_size.width/2));
    //Math.round => 소수점 이하 반올림 

    // f(x)=3x+4
    let expressionText = WebUI.currentText.includes('=')
         ? WebUI.currentText.split('=')[1] : WebUI.currentText;

    // 3x+4
    let splitExpression = [];

    const variables = ['x','y','z','w'];
    for (const x of variables) {
        if (expressionText.includes('x')) {
            splitExpression = expressionText.split(x);
            break;
        }
    }
    // [3, +4]

    let points = []
    for (var x = -10; x <= 10; x+=0.1) {
        let front = splitExpression[0];
        let back  = splitExpression[1];
        let expression = `${front}(${x})${back}`;
            console.log(expression);
        let y = WebUI.parser.eval(expression);
        points.push({x, y});
    }
 
    let coordinateToPlane = function(point) {
        return {
            x: (30/20)*(point.x+10)+100,
            y: (20/20)*(point.y+10)+100
        }
    }

    let isBegin = false;
    let graphString = "";
    for (const point of points) {
        let {x, y} = coordinateToPlane(point);
        //
        xLocation  = x;
        yLocation = y;
        isBegin = false;

        if(!isBegin) {
            graphString = `M ${x0-xLocation} ${y0-yLocation}`;
            isBegin  = true;
        }
        else {
            graphString = `L ${x0+xLocation} ${y0-yLocation}`;
        }
    }

    let updatePath = new fabric.Path(graphString,{
        width:          plane.desired_size.width,
        height:         plane.desired_size.height,
        stroke:         plane.stroke_color,
        strokeWidth:    1,
        fill:           '',
        selectable:     false,
    });

    let planeVisual = plane.visual_items[3];
    planeVisual.set({
        path: updatePath.path,
        width: updatePath.width,
        height: updatePath.height,        
        left: updatePath.left,
        top: updatePath.top,
        
        pathOffset: updatePath.pathOffset
    });
    planeVisual.setCoords();
    WebUI.canvas.requestRenderAll();
}


//
$(document).ready(function() {    
    WebUI.initialize();
});
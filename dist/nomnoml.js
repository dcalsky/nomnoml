var nomnoml;
(function (nomnoml) {
    var NullStyle = (function () {
        function NullStyle(conf) {
            this.bold = true;
            this.underline = false;
            this.italic = false;
            this.dashed = false;
            this.empty = false;
            this.center = false;
            this.fill = undefined;
            this.stroke = undefined;
            this.visual = 'class';
            this.direction = 'TB';
            this.hull = 'auto';
            this.stroke = conf.stroke;
        }
        return NullStyle;
    }());
    nomnoml.NullStyle = NullStyle;
    var Compartment = (function () {
        function Compartment(lines, nodes, relations) {
            this.lines = lines;
            this.nodes = nodes;
            this.relations = relations;
        }
        return Compartment;
    }());
    nomnoml.Compartment = Compartment;
    var Relation = (function () {
        function Relation() {
        }
        return Relation;
    }());
    nomnoml.Relation = Relation;
    var Classifier = (function () {
        function Classifier(type, name, compartments) {
            this.type = type;
            this.name = name;
            this.compartments = compartments;
        }
        return Classifier;
    }());
    nomnoml.Classifier = Classifier;
})(nomnoml || (nomnoml = {}));
var nomnoml;
(function (nomnoml) {
    function layout(measurer, config, ast) {
        function measureLines(lines, fontWeight) {
            if (!lines.length)
                return { width: 0, height: config.padding };
            measurer.setFont(config, fontWeight, 'normal');
            return {
                width: Math.round(skanaar.max(lines.map(measurer.textWidth)) + 2 * config.padding),
                height: Math.round(measurer.textHeight() * lines.length + 2 * config.padding)
            };
        }
        function layoutCompartment(c, compartmentIndex, style) {
            var textSize = measureLines(c.lines, compartmentIndex ? 'normal' : 'bold');
            c.width = textSize.width;
            c.height = textSize.height;
            if (!c.nodes.length && !c.relations.length)
                return;
            c.nodes.forEach(layoutClassifier);
            var g = new dagre.graphlib.Graph();
            g.setGraph({
                rankdir: style.direction || config.direction,
                nodesep: config.spacing,
                edgesep: config.spacing,
                ranksep: config.spacing
            });
            c.nodes.forEach(function (e) {
                g.setNode(e.name, { width: e.layoutWidth, height: e.layoutHeight });
            });
            c.relations.forEach(function (r) {
                g.setEdge(r.start, r.end, { id: r.id });
            });
            dagre.layout(g);
            var rels = skanaar.indexBy(c.relations, 'id');
            var nodes = skanaar.indexBy(c.nodes, 'name');
            function toPoint(o) { return { x: o.x, y: o.y }; }
            g.nodes().forEach(function (name) {
                var node = g.node(name);
                nodes[name].x = node.x;
                nodes[name].y = node.y;
            });
            g.edges().forEach(function (edgeObj) {
                var edge = g.edge(edgeObj);
                var start = nodes[edgeObj.v];
                var end = nodes[edgeObj.w];
                rels[edge.id].path = skanaar.flatten([[start], edge.points, [end]]).map(toPoint);
            });
            var graph = g.graph();
            var graphHeight = graph.height ? graph.height + 2 * config.gutter : 0;
            var graphWidth = graph.width ? graph.width + 2 * config.gutter : 0;
            c.width = Math.max(textSize.width, graphWidth) + 2 * config.padding;
            c.height = textSize.height + graphHeight + config.padding;
        }
        function layoutClassifier(clas) {
            var layout = getLayouter(clas);
            layout(clas);
            clas.layoutWidth = clas.width + 2 * config.edgeMargin;
            clas.layoutHeight = clas.height + 2 * config.edgeMargin;
        }
        function getLayouter(clas) {
            var style = config.styles[clas.type] || nomnoml.styles.CLASS;
            switch (style.hull) {
                case 'icon': return function (clas) {
                    clas.width = config.fontSize * 2.5;
                    clas.height = config.fontSize * 2.5;
                };
                case 'empty': return function (clas) {
                    clas.width = 0;
                    clas.height = 0;
                };
                default: return function (clas) {
                    clas.compartments.forEach(function (co, i) { layoutCompartment(co, i, style); });
                    clas.width = skanaar.max(clas.compartments, 'width');
                    clas.height = skanaar.sum(clas.compartments, 'height');
                    clas.x = clas.layoutWidth / 2;
                    clas.y = clas.layoutHeight / 2;
                    clas.compartments.forEach(function (co) { co.width = clas.width; });
                };
            }
        }
        layoutCompartment(ast, 0, nomnoml.styles.CLASS);
        return ast;
    }
    nomnoml.layout = layout;
})(nomnoml || (nomnoml = {}));
var nomnoml;
(function (nomnoml) {
    function fitCanvasSize(canvas, rect, zoom) {
        canvas.width = rect.width * zoom;
        canvas.height = rect.height * zoom;
    }
    function setFont(config, isBold, isItalic, graphics) {
        var style = (isBold === 'bold' ? 'bold' : '');
        if (isItalic)
            style = 'italic ' + style;
        var defaultFont = 'Helvetica, sans-serif';
        var font = skanaar.format('# #pt #, #', style, config.fontSize, config.font, defaultFont);
        graphics.font(font);
    }
    function parseAndRender(code, graphics, canvas, scale) {
        var parsedDiagram = nomnoml.parse(code);
        var config = parsedDiagram.config;
        var measurer = {
            setFont: function (conf, bold, ital) {
                setFont(conf, bold, ital, graphics);
            },
            textWidth: function (s) { return graphics.measureText(s).width; },
            textHeight: function () { return config.leading * config.fontSize; }
        };
        var layout = nomnoml.layout(measurer, config, parsedDiagram.root);
        fitCanvasSize(canvas, layout, config.zoom * scale);
        config.zoom *= scale;
        nomnoml.render(graphics, config, layout, measurer.setFont);
        return { config: config };
    }
    nomnoml.version = '0.5.0';
    function draw(canvas, code, scale) {
        return parseAndRender(code, skanaar.Canvas(canvas), canvas, scale || 1);
    }
    nomnoml.draw = draw;
    function renderSvg(code, docCanvas) {
        var parsedDiagram = nomnoml.parse(code);
        var config = parsedDiagram.config;
        var skCanvas = skanaar.Svg('', docCanvas);
        function setFont(config, isBold, isItalic) {
            var style = (isBold === 'bold' ? 'bold' : '');
            if (isItalic)
                style = 'italic ' + style;
            var defFont = 'Helvetica, sans-serif';
            var template = 'font-weight:#; font-size:#pt; font-family:\'#\', #';
            var font = skanaar.format(template, style, config.fontSize, config.font, defFont);
            skCanvas.font(font);
        }
        var measurer = {
            setFont: function (conf, bold, ital) {
                setFont(conf, bold, ital);
            },
            textWidth: function (s) { return skCanvas.measureText(s).width; },
            textHeight: function () { return config.leading * config.fontSize; }
        };
        var layout = nomnoml.layout(measurer, config, parsedDiagram.root);
        nomnoml.render(skCanvas, config, layout, measurer.setFont);
        return skCanvas.serialize({
            width: layout.width,
            height: layout.height
        });
    }
    nomnoml.renderSvg = renderSvg;
})(nomnoml || (nomnoml = {}));
var nomnoml;
(function (nomnoml) {
    var Line = (function () {
        function Line() {
        }
        return Line;
    }());
    function parse(source) {
        function onlyCompilables(line) {
            var ok = line[0] !== '#' && line.trim().substring(0, 2) !== '//';
            return ok ? line.trim() : '';
        }
        function isDirective(line) { return line.text[0] === '#'; }
        var lines = source.split('\n').map(function (s, i) {
            return { text: s, index: i };
        });
        var pureDirectives = lines.filter(isDirective);
        var directives = {};
        pureDirectives.forEach(function (line) {
            try {
                var tokens = line.text.substring(1).split(':');
                directives[tokens[0].trim()] = tokens[1].trim();
            }
            catch (e) {
                throw new Error('line ' + (line.index + 1));
            }
        });
        var pureDiagramCode = lines.map(function (e) { return onlyCompilables(e.text); }).join('\n').trim();
        var parseTree = nomnoml.intermediateParse(pureDiagramCode);
        return {
            root: nomnoml.transformParseIntoSyntaxTree(parseTree),
            config: getConfig(directives)
        };
        function directionToDagre(word) {
            if (word == 'down')
                return 'TB';
            if (word == 'left')
                return 'LR';
            else
                return 'TB';
        }
        function parseCustomStyle(styleDef) {
            var contains = skanaar.hasSubstring;
            return {
                bold: contains(styleDef, 'bold'),
                underline: contains(styleDef, 'underline'),
                italic: contains(styleDef, 'italic'),
                dashed: contains(styleDef, 'dashed'),
                empty: contains(styleDef, 'empty'),
                center: skanaar.last(styleDef.match('align=([^ ]*)') || []) == 'left' ? false : true,
                fill: skanaar.last(styleDef.match('fill=([^ ]*)') || []),
                stroke: skanaar.last(styleDef.match('stroke=([^ ]*)') || []),
                visual: skanaar.last(styleDef.match('visual=([^ ]*)') || []) || 'class',
                direction: directionToDagre(skanaar.last(styleDef.match('direction=([^ ]*)') || [])),
                hull: 'auto'
            };
        }
        function getConfig(d) {
            var userStyles = {};
            for (var key in d) {
                if (key[0] != '.')
                    continue;
                var styleDef = d[key];
                userStyles[key.substring(1).toUpperCase()] = parseCustomStyle(styleDef);
            }
            return {
                arrowSize: +d.arrowSize || 1,
                bendSize: +d.bendSize || 0.3,
                direction: directionToDagre(d.direction),
                gutter: +d.gutter || 5,
                edgeMargin: (+d.edgeMargin) || 0,
                edges: d.edges == 'hard' ? 'hard' : 'rounded',
                fill: (d.fill || '#eee8d5;#fdf6e3;#eee8d5;#fdf6e3').split(';'),
                fillArrows: d.fillArrows === 'true',
                font: d.font || 'Calibri',
                fontSize: (+d.fontSize) || 12,
                leading: (+d.leading) || 1.25,
                lineWidth: (+d.lineWidth) || 3,
                padding: (+d.padding) || 8,
                spacing: (+d.spacing) || 40,
                stroke: d.stroke || '#33322E',
                title: d.title || 'nomnoml',
                zoom: +d.zoom || 1,
                styles: skanaar.merged(nomnoml.styles, userStyles)
            };
        }
    }
    nomnoml.parse = parse;
    function intermediateParse(source) {
        return nomnomlCoreParser.parse(source);
    }
    nomnoml.intermediateParse = intermediateParse;
    function transformParseIntoSyntaxTree(entity) {
        function isAstClassifier(obj) {
            return obj.parts !== undefined;
        }
        function isAstRelation(obj) {
            return obj.assoc !== undefined;
        }
        function isAstCompartment(obj) {
            return Array.isArray(obj);
        }
        var relationId = 0;
        function transformCompartment(slots) {
            var lines = [];
            var rawClassifiers = [];
            var relations = [];
            slots.forEach(function (p) {
                if (typeof p === 'string')
                    lines.push(p);
                if (isAstRelation(p)) {
                    rawClassifiers.push(p.start);
                    rawClassifiers.push(p.end);
                    relations.push({
                        id: relationId++,
                        assoc: p.assoc,
                        start: p.start.parts[0][0],
                        end: p.end.parts[0][0],
                        startLabel: p.startLabel,
                        endLabel: p.endLabel
                    });
                }
                if (isAstClassifier(p)) {
                    rawClassifiers.push(p);
                }
            });
            var allClassifiers = rawClassifiers
                .map(transformClassifier)
                .sort(function (a, b) {
                return b.compartments.length - a.compartments.length;
            });
            var uniqClassifiers = skanaar.uniqueBy(allClassifiers, 'name');
            return new nomnoml.Compartment(lines, uniqClassifiers, relations);
        }
        function transformClassifier(entity) {
            var compartments = entity.parts.map(transformCompartment);
            return new nomnoml.Classifier(entity.type, entity.id, compartments);
        }
        function transformItem(entity) {
            if (typeof entity === 'string')
                return entity;
            if (isAstCompartment(entity))
                return transformCompartment(entity);
            if (isAstClassifier(entity)) {
                return transformClassifier(entity);
            }
            return undefined;
        }
        return transformCompartment(entity);
    }
    nomnoml.transformParseIntoSyntaxTree = transformParseIntoSyntaxTree;
})(nomnoml || (nomnoml = {}));
var nomnoml;
(function (nomnoml) {
    function render(graphics, config, compartment, setFont) {
        var padding = config.padding;
        var g = graphics;
        var vm = skanaar.vector;
        function renderCompartment(compartment, style, level) {
            g.save();
            g.translate(padding, padding);
            g.fillStyle(style.stroke || config.stroke);
            compartment.lines.forEach(function (text, i) {
                g.textAlign(style.center ? 'center' : 'left');
                var x = style.center ? compartment.width / 2 - padding : 0;
                var y = (0.5 + (i + 0.5) * config.leading) * config.fontSize;
                if (text) {
                    g.fillText(text, x, y);
                }
                if (style.underline) {
                    var w = g.measureText(text).width;
                    y += Math.round(config.fontSize * 0.2) + 0.5;
                    g.path([{ x: x - w / 2, y: y }, { x: x + w / 2, y: y }]).stroke();
                    g.lineWidth(config.lineWidth);
                }
            });
            g.translate(config.gutter, config.gutter);
            compartment.relations.forEach(function (r) { renderRelation(r, compartment); });
            compartment.nodes.forEach(function (n) { renderNode(n, level); });
            g.restore();
        }
        function renderNode(node, level) {
            var x = Math.round(node.x - node.width / 2);
            var y = Math.round(node.y - node.height / 2);
            var style = config.styles[node.type] || nomnoml.styles.CLASS;
            g.fillStyle(style.fill || config.fill[level] || skanaar.last(config.fill));
            g.strokeStyle(style.stroke || config.stroke);
            if (style.dashed) {
                var dash = Math.max(4, 2 * config.lineWidth);
                g.setLineDash([dash, dash]);
            }
            var drawNode = nomnoml.visualizers[style.visual] || nomnoml.visualizers["class"];
            drawNode(node, x, y, config, g);
            g.setLineDash([]);
            var yDivider = (style.visual === 'actor' ? y + padding * 3 / 4 : y);
            node.compartments.forEach(function (part, i) {
                var s = i > 0 ? new nomnoml.NullStyle({ stroke: style.stroke }) : style;
                if (s.empty)
                    return;
                g.save();
                g.translate(x, yDivider);
                setFont(config, s.bold ? 'bold' : 'normal', s.italic ? 'italic' : undefined);
                renderCompartment(part, s, level + 1);
                g.restore();
                if (i + 1 === node.compartments.length)
                    return;
                yDivider += part.height;
                if (style.visual === 'frame' && i === 0) {
                    var w = g.measureText(node.name).width + part.height / 2 + padding;
                    g.path([
                        { x: x, y: yDivider },
                        { x: x + w - part.height / 2, y: yDivider },
                        { x: x + w, y: yDivider - part.height / 2 },
                        { x: x + w, y: yDivider - part.height }
                    ]).stroke();
                }
                else {
                    g.path([{ x: x, y: yDivider }, { x: x + node.width, y: yDivider }]).stroke();
                }
            });
        }
        function strokePath(p) {
            if (config.edges === 'rounded') {
                var radius = config.spacing * config.bendSize;
                g.beginPath();
                g.moveTo(p[0].x, p[0].y);
                for (var i = 1; i < p.length - 1; i++) {
                    g.arcTo(p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, radius);
                }
                g.lineTo(skanaar.last(p).x, skanaar.last(p).y);
                g.stroke();
            }
            else
                g.path(p).stroke();
        }
        var empty = false, filled = true, diamond = true;
        function renderLabel(text, pos, quadrant) {
            if (text) {
                var fontSize = config.fontSize;
                var lines = text.split('`');
                var area = {
                    width: skanaar.max(lines.map(function (l) { return g.measureText(l).width; })),
                    height: fontSize * lines.length
                };
                var origin = {
                    x: pos.x + ((quadrant == 1 || quadrant == 4) ? padding : -area.width - padding),
                    y: pos.y + ((quadrant == 3 || quadrant == 4) ? padding : -area.height - padding)
                };
                lines.forEach(function (l, i) { g.fillText(l, origin.x, origin.y + fontSize * (i + 1)); });
            }
        }
        function quadrant(point, node, fallback) {
            if (point.x < node.x && point.y < node.y)
                return 1;
            if (point.x > node.x && point.y < node.y)
                return 2;
            if (point.x > node.x && point.y > node.y)
                return 3;
            if (point.x < node.x && point.y > node.y)
                return 4;
            return fallback;
        }
        function adjustQuadrant(quadrant, point, opposite) {
            if ((opposite.x == point.x) || (opposite.y == point.y))
                return quadrant;
            var flipHorizontally = [4, 3, 2, 1];
            var flipVertically = [2, 1, 4, 3];
            var oppositeQuadrant = (opposite.y < point.y) ?
                ((opposite.x < point.x) ? 2 : 1) :
                ((opposite.x < point.x) ? 3 : 4);
            if (oppositeQuadrant === quadrant) {
                if (config.direction === 'LR')
                    return flipHorizontally[quadrant - 1];
                if (config.direction === 'TB')
                    return flipVertically[quadrant - 1];
            }
            return quadrant;
        }
        function renderRelation(r, compartment) {
            var startNode = skanaar.find(compartment.nodes, function (e) { return e.name == r.start; });
            var endNode = skanaar.find(compartment.nodes, function (e) { return e.name == r.end; });
            var start = r.path[1];
            var end = r.path[r.path.length - 2];
            var path = r.path.slice(1, -1);
            g.fillStyle(config.stroke);
            setFont(config, 'normal');
            renderLabel(r.startLabel, start, adjustQuadrant(quadrant(start, startNode, 4), start, end));
            renderLabel(r.endLabel, end, adjustQuadrant(quadrant(end, endNode, 2), end, start));
            if (r.assoc !== '-/-') {
                if (skanaar.hasSubstring(r.assoc, '--')) {
                    var dash = Math.max(4, 2 * config.lineWidth);
                    g.setLineDash([dash, dash]);
                    strokePath(path);
                    g.setLineDash([]);
                }
                else
                    strokePath(path);
            }
            function drawArrowEnd(id, path, end) {
                if (id === '>' || id === '<')
                    drawArrow(path, filled, end, false);
                else if (id === ':>' || id === '<:')
                    drawArrow(path, empty, end, false);
                else if (id === '+')
                    drawArrow(path, filled, end, diamond);
                else if (id === 'o')
                    drawArrow(path, empty, end, diamond);
            }
            var tokens = r.assoc.split('-');
            drawArrowEnd(skanaar.last(tokens), path, end);
            drawArrowEnd(tokens[0], path.reverse(), start);
        }
        function drawArrow(path, isOpen, arrowPoint, diamond) {
            var size = config.spacing * config.arrowSize / 30;
            var v = vm.diff(path[path.length - 2], skanaar.last(path));
            var nv = vm.normalize(v);
            function getArrowBase(s) { return vm.add(arrowPoint, vm.mult(nv, s * size)); }
            var arrowBase = getArrowBase(diamond ? 7 : 10);
            var t = vm.rot(nv);
            var arrowButt = (diamond) ? getArrowBase(14)
                : (isOpen && !config.fillArrows) ? getArrowBase(5) : arrowBase;
            var arrow = [
                vm.add(arrowBase, vm.mult(t, 4 * size)),
                arrowButt,
                vm.add(arrowBase, vm.mult(t, -4 * size)),
                arrowPoint
            ];
            g.fillStyle(isOpen ? config.stroke : config.fill[0]);
            g.circuit(arrow).fillAndStroke();
        }
        function snapToPixels() {
            if (config.lineWidth % 2 === 1)
                g.translate(0.5, 0.5);
        }
        g.clear();
        setFont(config, 'bold');
        g.save();
        g.lineWidth(config.lineWidth);
        g.lineJoin('round');
        g.lineCap('round');
        g.strokeStyle(config.stroke);
        g.scale(config.zoom, config.zoom);
        snapToPixels();
        renderCompartment(compartment, new nomnoml.NullStyle({ stroke: undefined }), 0);
        g.restore();
    }
    nomnoml.render = render;
})(nomnoml || (nomnoml = {}));
var skanaar;
(function (skanaar) {
    function Canvas(canvas, callbacks) {
        var ctx = canvas.getContext('2d');
        var mousePos = { x: 0, y: 0 };
        var twopi = 2 * 3.1416;
        function mouseEventToPos(event) {
            var e = canvas;
            return {
                x: event.clientX - e.getBoundingClientRect().left - e.clientLeft + e.scrollLeft,
                y: event.clientY - e.getBoundingClientRect().top - e.clientTop + e.scrollTop
            };
        }
        if (callbacks) {
            canvas.addEventListener('mousedown', function (event) {
                if (callbacks.mousedown)
                    callbacks.mousedown(mouseEventToPos(event));
            });
            canvas.addEventListener('mouseup', function (event) {
                if (callbacks.mouseup)
                    callbacks.mouseup(mouseEventToPos(event));
            });
            canvas.addEventListener('mousemove', function (event) {
                mousePos = mouseEventToPos(event);
                if (callbacks.mousemove)
                    callbacks.mousemove(mouseEventToPos(event));
            });
        }
        var chainable = {
            stroke: function () {
                ctx.stroke();
                return chainable;
            },
            fill: function () {
                ctx.fill();
                return chainable;
            },
            fillAndStroke: function () {
                ctx.fill();
                ctx.stroke();
                return chainable;
            }
        };
        function color255(r, g, b, a) {
            var optionalAlpha = a === undefined ? 1 : a;
            var comps = [Math.floor(r), Math.floor(g), Math.floor(b), optionalAlpha];
            return 'rgba(' + comps.join() + ')';
        }
        function tracePath(path, offset, s) {
            s = s === undefined ? 1 : s;
            offset = offset || { x: 0, y: 0 };
            ctx.beginPath();
            ctx.moveTo(offset.x + s * path[0].x, offset.y + s * path[0].y);
            for (var i = 1, len = path.length; i < len; i++)
                ctx.lineTo(offset.x + s * path[i].x, offset.y + s * path[i].y);
            return chainable;
        }
        return {
            mousePos: function () { return mousePos; },
            width: function () { return canvas.width; },
            height: function () { return canvas.height; },
            background: function (r, g, b) {
                ctx.fillStyle = color255(r, g, b);
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            },
            clear: function () {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            },
            circle: function (p, r) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, twopi);
                return chainable;
            },
            ellipse: function (center, rx, ry, start, stop) {
                if (start === undefined)
                    start = 0;
                if (stop === undefined)
                    stop = twopi;
                ctx.beginPath();
                ctx.save();
                ctx.translate(center.x, center.y);
                ctx.scale(1, ry / rx);
                ctx.arc(0, 0, rx / 2, start, stop);
                ctx.restore();
                return chainable;
            },
            arc: function (x, y, r, start, stop) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.arc(x, y, r, start, stop);
                return chainable;
            },
            roundRect: function (x, y, w, h, r) {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + r, r);
                ctx.lineTo(x + w, y + h - r);
                ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
                ctx.lineTo(x + r, y + h);
                ctx.arcTo(x, y + h, x, y + h - r, r);
                ctx.lineTo(x, y + r);
                ctx.arcTo(x, y, x + r, y, r);
                ctx.closePath();
                return chainable;
            },
            rect: function (x, y, w, h) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
                return chainable;
            },
            path: tracePath,
            circuit: function (path, offset, s) {
                tracePath(path, offset, s);
                ctx.closePath();
                return chainable;
            },
            font: function (f) { ctx.font = f; },
            fillStyle: function (s) { ctx.fillStyle = s; },
            strokeStyle: function (s) { ctx.strokeStyle = s; },
            textAlign: function (a) { ctx.textAlign = a; },
            lineCap: function (cap) { ctx.lineCap = cap; return chainable; },
            lineJoin: function (join) { ctx.lineJoin = join; return chainable; },
            lineWidth: function (w) { ctx.lineWidth = w; return chainable; },
            arcTo: function () { return ctx.arcTo.apply(ctx, arguments); },
            beginPath: function () { return ctx.beginPath.apply(ctx, arguments); },
            fillText: function () { return ctx.fillText.apply(ctx, arguments); },
            lineTo: function () { return ctx.lineTo.apply(ctx, arguments); },
            measureText: function () { return ctx.measureText.apply(ctx, arguments); },
            moveTo: function () { return ctx.moveTo.apply(ctx, arguments); },
            restore: function () { return ctx.restore.apply(ctx, arguments); },
            save: function () { return ctx.save.apply(ctx, arguments); },
            scale: function () { return ctx.scale.apply(ctx, arguments); },
            setLineDash: function () { return ctx.setLineDash.apply(ctx, arguments); },
            stroke: function () { return ctx.stroke.apply(ctx, arguments); },
            translate: function () { return ctx.translate.apply(ctx, arguments); }
        };
    }
    skanaar.Canvas = Canvas;
})(skanaar || (skanaar = {}));
var skanaar;
(function (skanaar) {
    function Svg(globalStyle, canvas) {
        var initialState = {
            x: 0,
            y: 0,
            stroke: 'none',
            dashArray: 'none',
            fill: 'none',
            textAlign: 'left',
            font: null
        };
        var states = [initialState];
        var elements = [];
        var ctx = canvas ? canvas.getContext('2d') : null;
        var canUseCanvas = false;
        var waitingForFirstFont = true;
        var docFont = '';
        function Element(name, attr, content) {
            attr.style = attr.style || '';
            return {
                name: name,
                attr: attr,
                content: content || undefined,
                stroke: function () {
                    this.attr.style += 'stroke:' + lastDefined('stroke') +
                        ';fill:none;stroke-dasharray:' + lastDefined('dashArray') + ';';
                    return this;
                },
                fill: function () {
                    this.attr.style += 'stroke:none; fill:' + lastDefined('fill') + ';';
                    return this;
                },
                fillAndStroke: function () {
                    this.attr.style += 'stroke:' + lastDefined('stroke') + ';fill:' + lastDefined('fill') +
                        ';stroke-dasharray:' + lastDefined('dashArray') + ';';
                    return this;
                }
            };
        }
        function State(dx, dy) {
            return { x: dx, y: dy, stroke: null, fill: null, textAlign: null, dashArray: 'none', font: null };
        }
        function trans(coord, axis) {
            states.forEach(function (t) { coord += t[axis]; });
            return coord;
        }
        function tX(coord) { return Math.round(10 * trans(coord, 'x')) / 10; }
        function tY(coord) { return Math.round(10 * trans(coord, 'y')) / 10; }
        function lastDefined(property) {
            for (var i = states.length - 1; i >= 0; i--)
                if (states[i][property])
                    return states[i][property];
            return undefined;
        }
        function last(list) { return list[list.length - 1]; }
        function tracePath(path, offset, s) {
            s = s === undefined ? 1 : s;
            offset = offset || { x: 0, y: 0 };
            var d = path.map(function (e, i) {
                return (i ? 'L' : 'M') + tX(offset.x + s * e.x) + ' ' + tY(offset.y + s * e.y);
            }).join(' ');
            return newElement('path', { d: d });
        }
        function newElement(type, attr, content) {
            var element = Element(type, attr, content);
            elements.push(element);
            return element;
        }
        return {
            width: function () { return 0; },
            height: function () { return 0; },
            background: function () { },
            clear: function () { },
            circle: function (p, r) {
                var element = Element('circle', { r: r, cx: tX(p.x), cy: tY(p.y) });
                elements.push(element);
                return element;
            },
            ellipse: function (center, w, h, start, stop) {
                if (stop) {
                    var y = tY(center.y);
                    return newElement('path', { d: 'M' + tX(center.x - w / 2) + ' ' + y +
                            'A' + w / 2 + ' ' + h / 2 + ' 0 1 0 ' + tX(center.x + w / 2) + ' ' + y
                    });
                }
                else {
                    return newElement('ellipse', { cx: tX(center.x), cy: tY(center.y), rx: w / 2, ry: h / 2 });
                }
            },
            arc: function (x, y, r) {
                return newElement('ellipse', { cx: tX(x), cy: tY(y), rx: r, ry: r });
            },
            roundRect: function (x, y, w, h, r) {
                return newElement('rect', { x: tX(x), y: tY(y), rx: r, ry: r, height: h, width: w });
            },
            rect: function (x, y, w, h) {
                return newElement('rect', { x: tX(x), y: tY(y), height: h, width: w });
            },
            path: tracePath,
            circuit: function (path, offset, s) {
                var element = tracePath(path, offset, s);
                element.attr.d += ' Z';
                return element;
            },
            font: function (font) {
                last(states).font = font;
                if (waitingForFirstFont) {
                    if (ctx) {
                        var primaryFont = font.replace(/^.*family:/, '').replace(/[, ].*$/, '');
                        primaryFont = primaryFont.replace(/'/g, '');
                        canUseCanvas = /^(Arial|Helvetica|Times|Times New Roman)$/.test(primaryFont);
                        if (canUseCanvas) {
                            var fontSize = font.replace(/^.*font-size:/, '').replace(/;.*$/, '') + ' ';
                            if (primaryFont === 'Arial') {
                                docFont = fontSize + 'Arial, Helvetica, sans-serif';
                            }
                            else if (primaryFont === 'Helvetica') {
                                docFont = fontSize + 'Helvetica, Arial, sans-serif';
                            }
                            else if (primaryFont === 'Times New Roman') {
                                docFont = fontSize + '"Times New Roman", Times, serif';
                            }
                            else if (primaryFont === 'Times') {
                                docFont = fontSize + 'Times, "Times New Roman", serif';
                            }
                        }
                    }
                    waitingForFirstFont = false;
                }
            },
            strokeStyle: function (stroke) {
                last(states).stroke = stroke;
            },
            fillStyle: function (fill) {
                last(states).fill = fill;
            },
            arcTo: function (x1, y1, x2, y2) {
                last(elements).attr.d += ('L' + tX(x1) + ' ' + tY(y1) + ' L' + tX(x2) + ' ' + tY(y2) + ' ');
            },
            beginPath: function () {
                return newElement('path', { d: '' });
            },
            fillText: function (text, x, y) {
                var attr = { x: tX(x), y: tY(y), style: '' };
                var font = lastDefined('font');
                if (font.indexOf('bold') === -1) {
                    attr.style = 'font-weight:normal;';
                }
                if (font.indexOf('italic') > -1) {
                    attr.style += 'font-style:italic;';
                }
                if (lastDefined('textAlign') === 'center') {
                    attr.style += 'text-anchor: middle;';
                }
                function escapeHtml(unsafe) {
                    return unsafe
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                }
                return newElement('text', attr, escapeHtml(text));
            },
            lineCap: function (cap) { globalStyle += ';stroke-linecap:' + cap; return last(elements); },
            lineJoin: function (join) { globalStyle += ';stroke-linejoin:' + join; return last(elements); },
            lineTo: function (x, y) {
                last(elements).attr.d += ('L' + tX(x) + ' ' + tY(y) + ' ');
                return last(elements);
            },
            lineWidth: function (w) { globalStyle += ';stroke-width:' + w; return last(elements); },
            measureText: function (s) {
                if (canUseCanvas) {
                    var fontStr = lastDefined('font');
                    var italicSpec = (/\bitalic\b/.test(fontStr) ? 'italic' : 'normal') + ' normal ';
                    var boldSpec = /\bbold\b/.test(fontStr) ? 'bold ' : 'normal ';
                    ctx.font = italicSpec + boldSpec + docFont;
                    return ctx.measureText(s);
                }
                else {
                    return {
                        width: skanaar.sum(s, function (c) {
                            if (c === 'M' || c === 'W') {
                                return 14;
                            }
                            return c.charCodeAt(0) < 200 ? 9.5 : 16;
                        })
                    };
                }
            },
            moveTo: function (x, y) {
                last(elements).attr.d += ('M' + tX(x) + ' ' + tY(y) + ' ');
            },
            restore: function () {
                states.pop();
            },
            save: function () {
                states.push(State(0, 0));
            },
            scale: function () { },
            setLineDash: function (d) {
                last(states).dashArray = (d.length === 0) ? 'none' : d[0] + ' ' + d[1];
            },
            stroke: function () {
                last(elements).stroke();
            },
            textAlign: function (a) {
                last(states).textAlign = a;
            },
            translate: function (dx, dy) {
                last(states).x += dx;
                last(states).y += dy;
            },
            serialize: function (_attributes) {
                var attrs = _attributes || {};
                attrs.version = attrs.version || '1.1';
                attrs.baseProfile = attrs.baseProfile || 'full';
                attrs.width = attrs.width || '100%';
                attrs.height = attrs.height || '100%';
                if (attrs.width !== '100%' && attrs.height != '100%') {
                    attrs.viewbox = '0 0 ' + attrs.width + ' ' + attrs.height;
                }
                attrs.xmlns = attrs.xmlns || 'http://www.w3.org/2000/svg';
                attrs['xmlns:xlink'] = attrs['xmlns:xlink'] || 'http://www.w3.org/1999/xlink';
                attrs['xmlns:ev'] = attrs['xmlns:ev'] || 'http://www.w3.org/2001/xml-events';
                attrs.style = attrs.style || lastDefined('font') + ';' + globalStyle;
                function toAttr(obj) {
                    function toKeyValue(key) { return key + '="' + obj[key] + '"'; }
                    return Object.keys(obj).map(toKeyValue).join(' ');
                }
                function toHtml(e) {
                    return '<' + e.name + ' ' + toAttr(e.attr) + '>' + (e.content || '') + '</' + e.name + '>';
                }
                var innerSvg = elements.map(toHtml).join('\n');
                return toHtml(Element('svg', attrs, innerSvg));
            }
        };
    }
    skanaar.Svg = Svg;
})(skanaar || (skanaar = {}));
var skanaar;
(function (skanaar) {
    function plucker(pluckerDef) {
        switch (typeof pluckerDef) {
            case 'undefined': return function (e) { return e; };
            case 'string': return function (obj) { return obj[pluckerDef]; };
            case 'number': return function (obj) { return obj[pluckerDef]; };
            case 'function': return pluckerDef;
        }
    }
    skanaar.plucker = plucker;
    function max(list, plucker) {
        var transform = skanaar.plucker(plucker);
        var maximum = transform(list[0]);
        for (var i = 0; i < list.length; i++) {
            var item = transform(list[i]);
            maximum = (item > maximum) ? item : maximum;
        }
        return maximum;
    }
    skanaar.max = max;
    function sum(list, plucker) {
        var transform = skanaar.plucker(plucker);
        for (var i = 0, summation = 0, len = list.length; i < len; i++)
            summation += transform(list[i]);
        return summation;
    }
    skanaar.sum = sum;
    function flatten(lists) {
        var out = [];
        for (var i = 0; i < lists.length; i++)
            out = out.concat(lists[i]);
        return out;
    }
    skanaar.flatten = flatten;
    function find(list, predicate) {
        for (var i = 0; i < list.length; i++)
            if (predicate(list[i]))
                return list[i];
        return undefined;
    }
    skanaar.find = find;
    function last(list) {
        return list[list.length - 1];
    }
    skanaar.last = last;
    function hasSubstring(haystack, needle) {
        if (needle === '')
            return true;
        if (!haystack)
            return false;
        return haystack.indexOf(needle) !== -1;
    }
    skanaar.hasSubstring = hasSubstring;
    function format(template) {
        var parts = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            parts[_i - 1] = arguments[_i];
        }
        var matrix = template.split('#');
        var output = [matrix[0]];
        for (var i = 0; i < matrix.length - 1; i++) {
            output.push(parts[i] || '');
            output.push(matrix[i + 1]);
        }
        return output.join('');
    }
    skanaar.format = format;
    function merged(a, b) {
        function assign(target, data) {
            for (var key in data)
                target[key] = data[key];
        }
        var obj = {};
        assign(obj, a);
        assign(obj, b);
        return obj;
    }
    skanaar.merged = merged;
    function indexBy(list, key) {
        var obj = {};
        for (var i = 0; i < list.length; i++)
            obj[list[i][key]] = list[i];
        return obj;
    }
    skanaar.indexBy = indexBy;
    function uniqueBy(list, pluckerDef) {
        var seen = {};
        var getKey = skanaar.plucker(pluckerDef);
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var key = getKey(list[i]);
            if (!seen[key]) {
                seen[key] = true;
                out.push(list[i]);
            }
        }
        return out;
    }
    skanaar.uniqueBy = uniqueBy;
})(skanaar || (skanaar = {}));
var skanaar;
(function (skanaar) {
    skanaar.vector = {
        dist: function (a, b) { return skanaar.vector.mag(skanaar.vector.diff(a, b)); },
        add: function (a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
        diff: function (a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
        mult: function (v, factor) { return { x: factor * v.x, y: factor * v.y }; },
        mag: function (v) { return Math.sqrt(v.x * v.x + v.y * v.y); },
        normalize: function (v) { return skanaar.vector.mult(v, 1 / skanaar.vector.mag(v)); },
        rot: function (a) { return { x: a.y, y: -a.x }; }
    };
})(skanaar || (skanaar = {}));
var nomnoml;
(function (nomnoml) {
    var Y = true;
    var N = false;
    nomnoml.styles = {
        ABSTRACT: { center: Y, bold: N, direction: null, underline: N, italic: Y, dashed: N, empty: N, hull: 'auto', visual: 'class', fill: undefined, stroke: undefined },
        ACTOR: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'actor', fill: undefined, stroke: undefined },
        CHOICE: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'rhomb', fill: undefined, stroke: undefined },
        CLASS: { center: Y, bold: Y, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'class', fill: undefined, stroke: undefined },
        DATABASE: { center: Y, bold: Y, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'database', fill: undefined, stroke: undefined },
        END: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: Y, hull: 'icon', visual: 'end', fill: undefined, stroke: undefined },
        FRAME: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'frame', fill: undefined, stroke: undefined },
        HIDDEN: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: Y, hull: 'empty', visual: 'hidden', fill: undefined, stroke: undefined },
        INPUT: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'input', fill: undefined, stroke: undefined },
        INSTANCE: { center: Y, bold: N, direction: null, underline: Y, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'class', fill: undefined, stroke: undefined },
        LABEL: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'none', fill: undefined, stroke: undefined },
        NOTE: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'note', fill: undefined, stroke: undefined },
        PACKAGE: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'package', fill: undefined, stroke: undefined },
        RECEIVER: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'receiver', fill: undefined, stroke: undefined },
        REFERENCE: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: Y, empty: N, hull: 'auto', visual: 'class', fill: undefined, stroke: undefined },
        SENDER: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'sender', fill: undefined, stroke: undefined },
        START: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: Y, hull: 'icon', visual: 'start', fill: undefined, stroke: undefined },
        STATE: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'roundrect', fill: undefined, stroke: undefined },
        TRANSCEIVER: { center: N, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'transceiver', fill: undefined, stroke: undefined },
        USECASE: { center: Y, bold: N, direction: null, underline: N, italic: N, dashed: N, empty: N, hull: 'auto', visual: 'ellipse', fill: undefined, stroke: undefined }
    };
    nomnoml.visualizers = {
        actor: function (node, x, y, config, g) {
            var a = config.padding / 2;
            var yp = y + a / 2;
            var actorCenter = { x: node.x, y: yp - a };
            g.circle(actorCenter, a).fillAndStroke();
            g.path([{ x: node.x, y: yp }, { x: node.x, y: yp + 2 * a }]).stroke();
            g.path([{ x: node.x - a, y: yp + a }, { x: node.x + a, y: yp + a }]).stroke();
            g.path([{ x: node.x - a, y: yp + a + config.padding },
                { x: node.x, y: yp + config.padding },
                { x: node.x + a, y: yp + a + config.padding }]).stroke();
        },
        "class": function (node, x, y, config, g) {
            g.rect(x, y, node.width, node.height).fillAndStroke();
        },
        database: function (node, x, y, config, g) {
            var cy = y - config.padding / 2;
            var pi = 3.1416;
            g.rect(x, y, node.width, node.height).fill();
            g.path([{ x: x, y: cy }, { x: x, y: cy + node.height }]).stroke();
            g.path([
                { x: x + node.width, y: cy },
                { x: x + node.width, y: cy + node.height }
            ]).stroke();
            g.ellipse({ x: node.x, y: cy }, node.width, config.padding * 1.5).fillAndStroke();
            g.ellipse({ x: node.x, y: cy + node.height }, node.width, config.padding * 1.5, 0, pi)
                .fillAndStroke();
        },
        ellipse: function (node, x, y, config, g) {
            g.ellipse({ x: node.x, y: node.y }, node.width, node.height).fillAndStroke();
        },
        end: function (node, x, y, config, g) {
            g.circle({ x: node.x, y: y + node.height / 2 }, node.height / 3).fillAndStroke();
            g.fillStyle(config.stroke);
            g.circle({ x: node.x, y: y + node.height / 2 }, node.height / 3 - config.padding / 2).fill();
        },
        frame: function (node, x, y, config, g) {
            g.rect(x, y, node.width, node.height).fillAndStroke();
        },
        hidden: function (node, x, y, config, g) {
        },
        input: function (node, x, y, config, g) {
            g.circuit([
                { x: x + config.padding, y: y },
                { x: x + node.width, y: y },
                { x: x + node.width - config.padding, y: y + node.height },
                { x: x, y: y + node.height }
            ]).fillAndStroke();
        },
        none: function (node, x, y, config, g) {
        },
        note: function (node, x, y, config, g) {
            g.circuit([
                { x: x, y: y },
                { x: x + node.width - config.padding, y: y },
                { x: x + node.width, y: y + config.padding },
                { x: x + node.width, y: y + node.height },
                { x: x, y: y + node.height },
                { x: x, y: y }
            ]).fillAndStroke();
            g.path([
                { x: x + node.width - config.padding, y: y },
                { x: x + node.width - config.padding, y: y + config.padding },
                { x: x + node.width, y: y + config.padding }
            ]).stroke();
        },
        package: function (node, x, y, config, g) {
            var headHeight = node.compartments[0].height;
            g.rect(x, y + headHeight, node.width, node.height - headHeight).fillAndStroke();
            var w = g.measureText(node.name).width + 2 * config.padding;
            g.circuit([
                { x: x, y: y + headHeight },
                { x: x, y: y },
                { x: x + w, y: y },
                { x: x + w, y: y + headHeight }
            ]).fillAndStroke();
        },
        receiver: function (node, x, y, config, g) {
            g.circuit([
                { x: x - config.padding, y: y },
                { x: x + node.width, y: y },
                { x: x + node.width, y: y + node.height },
                { x: x - config.padding, y: y + node.height },
                { x: x, y: y + node.height / 2 },
            ]).fillAndStroke();
        },
        rhomb: function (node, x, y, config, g) {
            g.circuit([
                { x: node.x, y: y - config.padding },
                { x: x + node.width + config.padding, y: node.y },
                { x: node.x, y: y + node.height + config.padding },
                { x: x - config.padding, y: node.y }
            ]).fillAndStroke();
        },
        roundrect: function (node, x, y, config, g) {
            var r = Math.min(config.padding * 2 * config.leading, node.height / 2);
            g.roundRect(x, y, node.width, node.height, r).fillAndStroke();
        },
        sender: function (node, x, y, config, g) {
            g.circuit([
                { x: x, y: y },
                { x: x + node.width - config.padding, y: y },
                { x: x + node.width, y: y + node.height / 2 },
                { x: x + node.width - config.padding, y: y + node.height },
                { x: x, y: y + node.height }
            ]).fillAndStroke();
        },
        start: function (node, x, y, config, g) {
            g.fillStyle(config.stroke);
            g.circle({ x: node.x, y: y + node.height / 2 }, node.height / 2.5).fill();
        },
        transceiver: function (node, x, y, config, g) {
            g.circuit([
                { x: x - config.padding, y: y },
                { x: x + node.width, y: y },
                { x: x + node.width + config.padding, y: y + node.height / 2 },
                { x: x + node.width, y: y + node.height },
                { x: x - config.padding, y: y + node.height },
                { x: x, y: y + node.height / 2 }
            ]).fillAndStroke();
        }
    };
})(nomnoml || (nomnoml = {}));

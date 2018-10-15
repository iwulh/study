/*
 * JQuery zTree core v3.5.30
 * http://treejs.cn/
 *
 * Copyright (c) 2010 Hunter.z
 *
 * Licensed same as jquery - MIT License
 * http://www.opensource.org/licenses/mit-license.php
 *
 * email: hunter.z@263.net
 * Date: 2017-11-11
 */
(function ($) {
    var settings = {}, roots = {}, caches = {},
        //default consts of core
        _consts = {
            className: {
                BUTTON: "button",
                LEVEL: "level",
                ICO_LOADING: "ico_loading",
                SWITCH: "switch",
                NAME: 'node_name'
            },
            event: {
                NODECREATED: "ztree_nodeCreated",
                CLICK: "ztree_click",
                EXPAND: "ztree_expand",
                COLLAPSE: "ztree_collapse",
                ASYNC_SUCCESS: "ztree_async_success",
                ASYNC_ERROR: "ztree_async_error",
                REMOVE: "ztree_remove",
                SELECTED: "ztree_selected",
                UNSELECTED: "ztree_unselected"
            },
            id: {
                A: "_a",
                ICON: "_ico",
                SPAN: "_span",
                SWITCH: "_switch",
                UL: "_ul"
            },
            line: {
                ROOT: "root",
                ROOTS: "roots",
                CENTER: "center",
                BOTTOM: "bottom",
                NOLINE: "noline",
                LINE: "line"
            },
            folder: {
                OPEN: "open",
                CLOSE: "close",
                DOCU: "docu"
            },
            node: {
                CURSELECTED: "curSelectedNode"
            }
        },
        //default setting of core
        _setting = {
            treeId: "",
            treeObj: null,
            view: {
                addDiyDom: null,
                autoCancelSelected: true,
                dblClickExpand: true,
                expandSpeed: "fast",
                fontCss: {},
                nameIsHTML: false,
                selectedMulti: true,
                showIcon: true,
                showLine: true,
                showTitle: true,
                txtSelectedEnable: false
            },
            data: {
                key: {
                    children: "children",
                    name: "name",
                    title: "",
                    url: "url",
                    icon: "icon"
                },
                simpleData: {
                    enable: false,
                    idKey: "id",
                    pIdKey: "pId",
                    rootPId: null
                },
                keep: {
                    parent: false,
                    leaf: false
                }
            },
            async: {
                enable: false,
                contentType: "application/x-www-form-urlencoded",
                type: "post",
                dataType: "text",
                url: "",
                autoParam: [],
                otherParam: [],
                dataFilter: null
            },
            callback: {
                beforeAsync: null,
                beforeClick: null,
                beforeDblClick: null,
                beforeRightClick: null,
                beforeMouseDown: null,
                beforeMouseUp: null,
                beforeExpand: null,
                beforeCollapse: null,
                beforeRemove: null,

                onAsyncError: null,
                onAsyncSuccess: null,
                onNodeCreated: null,
                onClick: null,
                onDblClick: null,
                onRightClick: null,
                onMouseDown: null,
                onMouseUp: null,
                onExpand: null,
                onCollapse: null,
                onRemove: null
            }
        },
        //default root of core
        //zTree use root to save full data
        _initRoot = function (setting) {
            var r = data.getRoot(setting);
            if (!r) {
                r = {};
                data.setRoot(setting, r);
            }
            r[setting.data.key.children] = [];
            r.expandTriggerFlag = false;
            r.curSelectedList = [];
            r.noSelection = true;
            r.createdNodes = [];
            r.zId = 0;
            r._ver = (new Date()).getTime();
        },
        //default cache of core
        _initCache = function (setting) {
            var c = data.getCache(setting);
            if (!c) {
                c = {};
                data.setCache(setting, c);
            }
            c.nodes = [];
            c.doms = [];
        },
        //default bindEvent of core
        _bindEvent = function (setting) {
            var o = setting.treeObj,
                c = consts.event;
            o.bind(c.NODECREATED, function (event, treeId, node) {
                tools.apply(setting.callback.onNodeCreated, [event, treeId, node]);
            });

            o.bind(c.CLICK, function (event, srcEvent, treeId, node, clickFlag) {
                tools.apply(setting.callback.onClick, [srcEvent, treeId, node, clickFlag]);
            });

            o.bind(c.EXPAND, function (event, treeId, node) {
                tools.apply(setting.callback.onExpand, [event, treeId, node]);
            });

            o.bind(c.COLLAPSE, function (event, treeId, node) {
                tools.apply(setting.callback.onCollapse, [event, treeId, node]);
            });

            o.bind(c.ASYNC_SUCCESS, function (event, treeId, node, msg) {
                tools.apply(setting.callback.onAsyncSuccess, [event, treeId, node, msg]);
            });

            o.bind(c.ASYNC_ERROR, function (event, treeId, node, XMLHttpRequest, textStatus, errorThrown) {
                tools.apply(setting.callback.onAsyncError, [event, treeId, node, XMLHttpRequest, textStatus, errorThrown]);
            });

            o.bind(c.REMOVE, function (event, treeId, treeNode) {
                tools.apply(setting.callback.onRemove, [event, treeId, treeNode]);
            });

            o.bind(c.SELECTED, function (event, treeId, node) {
                tools.apply(setting.callback.onSelected, [treeId, node]);
            });
            o.bind(c.UNSELECTED, function (event, treeId, node) {
                tools.apply(setting.callback.onUnSelected, [treeId, node]);
            });
        },
        _unbindEvent = function (setting) {
            var o = setting.treeObj,
                c = consts.event;
            o.unbind(c.NODECREATED)
                .unbind(c.CLICK)
                .unbind(c.EXPAND)
                .unbind(c.COLLAPSE)
                .unbind(c.ASYNC_SUCCESS)
                .unbind(c.ASYNC_ERROR)
                .unbind(c.REMOVE)
                .unbind(c.SELECTED)
                .unbind(c.UNSELECTED);
        },
        //default event proxy of core
        _eventProxy = function (event) {
            var target = event.target,
                setting = data.getSetting(event.data.treeId),
                tId = "", node = null,
                nodeEventType = "", treeEventType = "",
                nodeEventCallback = null, treeEventCallback = null,
                tmp = null;

            if (tools.eqs(event.type, "mousedown")) {
                treeEventType = "mousedown";
            } else if (tools.eqs(event.type, "mouseup")) {
                treeEventType = "mouseup";
            } else if (tools.eqs(event.type, "contextmenu")) {
                treeEventType = "contextmenu";
            } else if (tools.eqs(event.type, "click")) {
                if (tools.eqs(target.tagName, "span") && target.getAttribute("treeNode" + consts.id.SWITCH) !== null) {
                    tId = tools.getNodeMainDom(target).id;
                    nodeEventType = "switchNode";
                } else {
                    tmp = tools.getMDom(setting, target, [{tagName: "a", attrName: "treeNode" + consts.id.A}]);
                    if (tmp) {
                        tId = tools.getNodeMainDom(tmp).id;
                        nodeEventType = "clickNode";
                    }
                }
            } else if (tools.eqs(event.type, "dblclick")) {
                treeEventType = "dblclick";
                tmp = tools.getMDom(setting, target, [{tagName: "a", attrName: "treeNode" + consts.id.A}]);
                if (tmp) {
                    tId = tools.getNodeMainDom(tmp).id;
                    nodeEventType = "switchNode";
                }
            }
            if (treeEventType.length > 0 && tId.length == 0) {
                tmp = tools.getMDom(setting, target, [{tagName: "a", attrName: "treeNode" + consts.id.A}]);
                if (tmp) {
                    tId = tools.getNodeMainDom(tmp).id;
                }
            }
            // event to node
            if (tId.length > 0) {
                node = data.getNodeCache(setting, tId);
                switch (nodeEventType) {
                    case "switchNode" :
                        if (!node.isParent) {
                            nodeEventType = "";
                        } else if (tools.eqs(event.type, "click")
                            || (tools.eqs(event.type, "dblclick") && tools.apply(setting.view.dblClickExpand, [setting.treeId, node], setting.view.dblClickExpand))) {
                            nodeEventCallback = handler.onSwitchNode;
                        } else {
                            nodeEventType = "";
                        }
                        break;
                    case "clickNode" :
                        nodeEventCallback = handler.onClickNode;
                        break;
                }
            }
            // event to zTree
            switch (treeEventType) {
                case "mousedown" :
                    treeEventCallback = handler.onZTreeMousedown;
                    break;
                case "mouseup" :
                    treeEventCallback = handler.onZTreeMouseup;
                    break;
                case "dblclick" :
                    treeEventCallback = handler.onZTreeDblclick;
                    break;
                case "contextmenu" :
                    treeEventCallback = handler.onZTreeContextmenu;
                    break;
            }
            var proxyResult = {
                stop: false,
                node: node,
                nodeEventType: nodeEventType,
                nodeEventCallback: nodeEventCallback,
                treeEventType: treeEventType,
                treeEventCallback: treeEventCallback
            };
            return proxyResult
        },
        //default init node of core
        _initNode = function (setting, level, n, parentNode, isFirstNode, isLastNode, openFlag) {
            if (!n) return;
            var r = data.getRoot(setting),
                childKey = setting.data.key.children;
            n.level = level;
            n.tId = setting.treeId + "_" + (++r.zId);
            n.parentTId = parentNode ? parentNode.tId : null;
            n.open = (typeof n.open == "string") ? tools.eqs(n.open, "true") : !!n.open;
            if (n[childKey] && n[childKey].length > 0) {
                n.isParent = true;
                n.zAsync = true;
            } else {
                n.isParent = (typeof n.isParent == "string") ? tools.eqs(n.isParent, "true") : !!n.isParent;
                n.open = (n.isParent && !setting.async.enable) ? n.open : false;
                n.zAsync = !n.isParent;
            }
            n.isFirstNode = isFirstNode;
            n.isLastNode = isLastNode;
            n.getParentNode = function () {
                return data.getNodeCache(setting, n.parentTId);
            };
            n.getPreNode = function () {
                return data.getPreNode(setting, n);
            };
            n.getNextNode = function () {
                return data.getNextNode(setting, n);
            };
            n.getIndex = function () {
                return data.getNodeIndex(setting, n);
            };
            n.getPath = function () {
                return data.getNodePath(setting, n);
            };
            n.isAjaxing = false;
            data.fixPIdKeyValue(setting, n);
        },
        _init = {
            bind: [_bindEvent],
            unbind: [_unbindEvent],
            caches: [_initCache],
            nodes: [_initNode],
            proxys: [_eventProxy],
            roots: [_initRoot],
            beforeA: [],
            afterA: [],
            innerBeforeA: [],
            innerAfterA: [],
            zTreeTools: []
        },
        //method of operate data
        data = {
            addNodeCache: function (setting, node) {
                data.getCache(setting).nodes[data.getNodeCacheId(node.tId)] = node;
            },
            getNodeCacheId: function (tId) {
                return tId.substring(tId.lastIndexOf("_") + 1);
            },
            addAfterA: function (afterA) {
                _init.afterA.push(afterA);
            },
            addBeforeA: function (beforeA) {
                _init.beforeA.push(beforeA);
            },
            addInnerAfterA: function (innerAfterA) {
                _init.innerAfterA.push(innerAfterA);
            },
            addInnerBeforeA: function (innerBeforeA) {
                _init.innerBeforeA.push(innerBeforeA);
            },
            addInitBind: function (bindEvent) {
                _init.bind.push(bindEvent);
            },
            addInitUnBind: function (unbindEvent) {
                _init.unbind.push(unbindEvent);
            },
            addInitCache: function (initCache) {
                _init.caches.push(initCache);
            },
            addInitNode: function (initNode) {
                _init.nodes.push(initNode);
            },
            addInitProxy: function (initProxy, isFirst) {
                if (!!isFirst) {
                    _init.proxys.splice(0, 0, initProxy);
                } else {
                    _init.proxys.push(initProxy);
                }
            },
            addInitRoot: function (initRoot) {
                _init.roots.push(initRoot);
            },
            addNodesData: function (setting, parentNode, index, nodes) {
                var childKey = setting.data.key.children, params;
                if (!parentNode[childKey]) {
                    parentNode[childKey] = [];
                    index = -1;
                } else if (index >= parentNode[childKey].length) {
                    index = -1;
                }

                if (parentNode[childKey].length > 0 && index === 0) {
                    parentNode[childKey][0].isFirstNode = false;
                    view.setNodeLineIcos(setting, parentNode[childKey][0]);
                } else if (parentNode[childKey].length > 0 && index < 0) {
                    parentNode[childKey][parentNode[childKey].length - 1].isLastNode = false;
                    view.setNodeLineIcos(setting, parentNode[childKey][parentNode[childKey].length - 1]);
                }
                parentNode.isParent = true;

                if (index < 0) {
                    parentNode[childKey] = parentNode[childKey].concat(nodes);
                } else {
                    params = [index, 0].concat(nodes);
                    parentNode[childKey].splice.apply(parentNode[childKey], params);
                }
            },
            addSelectedNode: function (setting, node) {
                var root = data.getRoot(setting);
                if (!data.isSelectedNode(setting, node)) {
                    root.curSelectedList.push(node);
                }
            },
            addCreatedNode: function (setting, node) {
                if (!!setting.callback.onNodeCreated || !!setting.view.addDiyDom) {
                    var root = data.getRoot(setting);
                    root.createdNodes.push(node);
                }
            },
            addZTreeTools: function (zTreeTools) {
                _init.zTreeTools.push(zTreeTools);
            },
            exSetting: function (s) {
                $.extend(true, _setting, s);
            },
            fixPIdKeyValue: function (setting, node) {
                if (setting.data.simpleData.enable) {
                    node[setting.data.simpleData.pIdKey] = node.parentTId ? node.getParentNode()[setting.data.simpleData.idKey] : setting.data.simpleData.rootPId;
                }
            },
            getAfterA: function (setting, node, array) {
                for (var i = 0, j = _init.afterA.length; i < j; i++) {
                    _init.afterA[i].apply(this, arguments);
                }
            },
            getBeforeA: function (setting, node, array) {
                for (var i = 0, j = _init.beforeA.length; i < j; i++) {
                    _init.beforeA[i].apply(this, arguments);
                }
            },
            getInnerAfterA: function (setting, node, array) {
                for (var i = 0, j = _init.innerAfterA.length; i < j; i++) {
                    _init.innerAfterA[i].apply(this, arguments);
                }
            },
            getInnerBeforeA: function (setting, node, array) {
                for (var i = 0, j = _init.innerBeforeA.length; i < j; i++) {
                    _init.innerBeforeA[i].apply(this, arguments);
                }
            },
            getCache: function (setting) {
                return caches[setting.treeId];
            },
            getNodeIndex: function (setting, node) {
                if (!node) return null;
                var childKey = setting.data.key.children,
                    p = node.parentTId ? node.getParentNode() : data.getRoot(setting);
                for (var i = 0, l = p[childKey].length - 1; i <= l; i++) {
                    if (p[childKey][i] === node) {
                        return i;
                    }
                }
                return -1;
            },
            getNextNode: function (setting, node) {
                if (!node) return null;
                var childKey = setting.data.key.children,
                    p = node.parentTId ? node.getParentNode() : data.getRoot(setting);
                for (var i = 0, l = p[childKey].length - 1; i <= l; i++) {
                    if (p[childKey][i] === node) {
                        return (i == l ? null : p[childKey][i + 1]);
                    }
                }
                return null;
            },
            getNodeByParam: function (setting, nodes, key, value) {
                if (!nodes || !key) return null;
                var childKey = setting.data.key.children;
                for (var i = 0, l = nodes.length; i < l; i++) {
                    if (nodes[i][key] == value) {
                        return nodes[i];
                    }
                    var tmp = data.getNodeByParam(setting, nodes[i][childKey], key, value);
                    if (tmp) return tmp;
                }
                return null;
            },
            getNodeCache: function (setting, tId) {
                if (!tId) return null;
                var n = caches[setting.treeId].nodes[data.getNodeCacheId(tId)];
                return n ? n : null;
            },
            getNodeName: function (setting, node) {
                var nameKey = setting.data.key.name;
                return "" + node[nameKey];
            },
            getNodePath: function (setting, node) {
                if (!node) return null;

                var path;
                if (node.parentTId) {
                    path = node.getParentNode().getPath();
                } else {
                    path = [];
                }

                if (path) {
                    path.push(node);
                }

                return path;
            },
            getNodeTitle: function (setting, node) {
                var t = setting.data.key.title === "" ? setting.data.key.name : setting.data.key.title;
                return "" + node[t];
            },
            getNodes: function (setting) {
                return data.getRoot(setting)[setting.data.key.children];
            },
            getNodesByParam: function (setting, nodes, key, value) {
                if (!nodes || !key) return [];
                var childKey = setting.data.key.children,
                    result = [];
                for (var i = 0, l = nodes.length; i < l; i++) {
                    if (nodes[i][key] == value) {
                        result.push(nodes[i]);
                    }
                    result = result.concat(data.getNodesByParam(setting, nodes[i][childKey], key, value));
                }
                return result;
            },
            getNodesByParamFuzzy: function (setting, nodes, key, value) {
                if (!nodes || !key) return [];
                var childKey = setting.data.key.children,
                    result = [];
                value = value.toLowerCase();
                for (var i = 0, l = nodes.length; i < l; i++) {
                    if (typeof nodes[i][key] == "string" && nodes[i][key].toLowerCase().indexOf(value) > -1) {
                        result.push(nodes[i]);
                    }
                    result = result.concat(data.getNodesByParamFuzzy(setting, nodes[i][childKey], key, value));
                }
                return result;
            },
            getNodesByFilter: function (setting, nodes, filter, isSingle, invokeParam) {
                if (!no�m+�(��G���ⵎ�A7�����J�p"��Tp��۽�>RR�q�8�z��9IW�}�=��H����eog�UK�dl�h�@ig�Q��$��o��X+�����j����aS�վ�[����{����c3;�K�?�Aј�O枌3�v��tp���ΩD�a��~.<|��L�f'��zY�8�t/�Ih����xŮg^��bf�B�C��p�1��JxLs^
L����dph��,T-��繝��]���lja��P:O��b7�6�Aq��S��[�Np���26I�=K��]�l�r�d�1%=���&o����i�)����=_�0`�$�q��Gm=�p���"���D�,:�k��d�hv�õ����n�^�5��?����~U5z-�+ ��
�����Y�.�ɱ%![tO�3K�%�/�3w�!6[L����P���Im��6�QnF
K��S�'M�kB�Lz��C�D]7�[z����Y>*��y�8)�/��Ÿ7F&�#90n֌D���H���l��}I���W"�����WFZ�os�~��}��Yw����P���7kX�:�
�@�X�0����W+Z���'J��S�zH*S���^z;�.
x���|��9�i��@ �w�hD�
~���[a4�va�[ߨNO�~ !��������w�(So�8��2�\�'NW;&d�����75����v7���.{	��G�>�-
 G�Q�0p�����f&̊��2���H���R�n�&c߀����=R�j,���m���b�/Y�4NH���=n���B��̥��֩,�zŠ!v:������Q���9�={v,T0�2T[�-�CgluP�Q�B
���K��P|#�&E��Щ�jo��ı�.C+d�O�[-�_�eEю�9`��K��D���3�˴��HPB S����%�uI��ej��
�A��r�Ҙ��/dq����
~[���y���6��^�:��uV)������%.�B�����H���t��4�p�%�\����*��j&l�1�@䇌o���lC�w�����u�����[��I�캩,��Zo[�}�x(#�Qjy����������?��嗯�:E�{g����q�����/�_^���d&���l9ݎe��L�M@pr���.���*i��������]�ѐ����	6W2��x���Q�Qd�0��]�&6��@�^��F%6B���pm��m{�OZ,�c��[���q¼Es,��<>����#���Y�.��|6{��y����w7aѥ;E\��+��0�Q�Ek\Ϙ�5�iH���1�c�Ɣe׺�`�E"		8��Ӻ����o��UFA�J�,��Ї�r��l��Iz)k��U|S��t���`Y�1^1���n�.���uX,���h��'2'���#�;��#��!�;th Q�/u�}���wג�5#��
_�r�a����<"�!-��EH&+�.k�R�ʲ�
                        data.removeNodeCache(setting, node[childKey][i]);
                    }
                }
                data.getCache(setting).nodes[data.getNodeCacheId(node.tId)] = null;
            },
            removeSelectedNode: function (setting, node) {
                var root = data.getRoot(setting);
                for (var i = 0, j = root.curSelectedList.length; i < j; i++) {
                    if (node === root.curSelectedList[i] || !data.getNodeCache(setting, root.curSelectedList[i].tId)) {
                        root.curSelectedList.splice(i, 1);
                        setting.treeObj.trigger(consts.event.UNSELECTED, [setting.treeId, node]);
                        i--;
                        j--;
                    }
                }
            },
            setCache: function (setting, cache) {
                caches[setting.treeId] = cache;
            },
            setRoot: function (setting, root) {
                roots[setting.treeId] = root;
            },
            setZTreeTools: function (setting, zTreeTools) {
                for (var i = 0, j = _init.zTreeTools.length; i < j; i++) {
                    _init.zTreeTools[i].apply(this, arguments);
                }
            },
            transformToArrayFormat: function (setting, nodes) {
                if (!nodes) return [];
                var childKey = setting.data.key.children,
                    r = [];
                if (tools.isArray(nodes)) {
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        r.push(nodes[i]);
                        if (nodes[i][childKey])
                            r = r.concat(data.transformToArrayFormat(setting, nodes[i][childKey]));
                    }
                } else {
                    r.push(nodes);
                    if (nodes[childKey])
                        r = r.concat(data.transformToArrayFormat(setting, nodes[childKey]));
                }
                return r;
            },
            transformTozTreeFormat: function (setting, sNodes) {
                var i, l,
                    key = setting.data.simpleData.idKey,
                    parentKey = setting.data.simpleData.pIdKey,
                    childKey = setting.data.key.children;
                if (!key || key == "" || !sNodes) return [];

                if (tools.isArray(sNodes)) {
                    var r = [];
                    var tmpMap = {};
                    for (i = 0, l = sNodes.length; i < l; i++) {
                        tmpMap[sNodes[i][key]] = sNodes[i];
                    }
                    for (i = 0, l = sNodes.length; i < l; i++) {
                        if (tmpMap[sNodes[i][parentKey]] && sNodes[i][key] != sNodes[i][parentKey]) {
                            if (!tmpMap[sNodes[i][parentKey]][childKey])
                                tmpMap[sNodes[i][parentKey]][childKey] = [];
                            tmpMap[sNodes[i][parentKey]][childKey].push(sNodes[i]);
                        } else {
                            r.push(sNodes[i]);
                        }
                    }
                    return r;
                } else {
                    return [sNodes];
                }
            }
        },
        //method of event proxy
        event = {
            bindEvent: function (setting) {
                for (var i = 0, j = _init.bind.length; i < j; i++) {
                    _init.bind[i].apply(this, arguments);
                }
            },
            unbindEvent: function (setting) {
                for (var i = 0, j = _init.unbind.length; i < j; i++) {
                    _init.unbind[i].apply(this, arguments);
                }
            },
            bindTree: function (setting) {
                var eventParam = {
                        treeId: setting.treeId
                    },
                    o = setting.treeObj;
                if (!setting.view.txtSelectedEnable) {
                    // for can't select text
                    o.bind('selectstart', handler.onSelectStart).css({
                        "-moz-user-select": "-moz-none"
                    });
                }
                o.bind('click', eventParam, event.proxy);
                o.bind('dblclick', eventParam, event.proxy);
                o.bind('mouseover', eventParam, event.proxy);
                o.bind('mouseout', eventParam, event.proxy);
                o.bind('mousedown', eventParam, event.proxy);
                o.bind('mouseup', eventParam, event.proxy);
                o.bind('contextmenu', eventParam, event.proxy);
            },
            unbindTree: function (setting) {
                var o = setting.treeObj;
                o.unbind('selectstart', handler.onSelectStart)
                    .unbind('click', event.proxy)
                    .unbind('dblclick', event.proxy)
                    .unbind('mouseover', event.proxy)
                    .unbind('mouseout', event.proxy)
                    .unbind('mousedown', event.proxy)
                    .unbind('mouseup', event.proxy)
                    .unbind('contextmenu', event.proxy);
            },
            doProxy: function (e) {
                var results = [];
                for (var i = 0, j = _init.proxys.length; i < j; i++) {
                    var proxyResult = _init.proxys[i].apply(this, arguments);
                    results.push(proxyResult);
                    if (proxyResult.stop) {
                        break;
                    }
                }
                return results;
            },
            proxy: function (e) {
                var setting = data.getSetting(e.data.treeId);
                if (!tools.uCanDo(setting, e)) return true;
                var results = event.doProxy(e),
                    r = true, x = false;
                for (var i = 0, l = results.length; i < l; i++) {
                    var proxyResult = results[i];
                    if (proxyResult.nodeEventCallback) {
                        x = true;
                        r = proxyResult.nodeEventCallback.apply(proxyResult, [e, proxyResult.node]) && r;
                    }
                    if (proxyResult.treeEventCallback) {
                        x = true;
                        r = proxyResult.treeEventCallback.apply(proxyResult, [e, proxyResult.node]) && r;
                    }
                }
                return r;
            }
        },
        //method of event handler
        handler = {
            onSwitchNode: function (event, node) {
                var setting = data.getSetting(event.data.treeId);
                if (node.open) {
                    if (tools.apply(setting.callback.beforeCollapse, [setting.treeId, node], true) == false) return true;
                    data.getRoot(setting).expandTriggerFlag = true;
                    view.switchNode(setting, node);
                } else {
                    if (tools.apply(setting.callback.beforeExpand, [setting.treeId, node], true) == false) return true;
                    data.getRoot(setting).expandTriggerFlag = true;
                    view.switchNode(setting, node);
                }
                return true;
            },
            onClickNode: function (event, node) {
                var setting = data.getSetting(event.data.treeId),
                    clickFlag = ( (setting.view.autoCancelSelected && (event.ctrlKey || event.metaKey)) && data.isSelectedNode(setting, node)) ? 0 : (setting.view.autoCancelSelected && (event.ctrlKey || event.metaKey) && setting.view.selectedMulti) ? 2 : 1;
                if (tools.apply(setting.callback.beforeClick, [setting.treeId, node, clickFlag], true) == false) return true;
                if (clickFlag === 0) {
                    view.cancelPreSelectedNode(setting, node);
                } else {
                    view.selectNode(setting, node, clickFlag === 2);
                }
                setting.treeObj.trigger(consts.event.CLICK, [event, setting.treeId, node, clickFlag]);
                return true;
            },
            onZTreeMousedown: function (event, node) {
                var setting = data.getSetting(event.data.treeId);
                if (tools.apply(setting.callback.beforeMouseDown, [setting.treeId, node], true)) {
                    tools.apply(setting.callback.onMouseDown, [event, setting.treeId, node]);
                }
                return true;
            },
            onZTreeMouseup: function (event, node) {
                var setting = data.getSetting(event.data.treeId);
                if (tools.apply(setting.callback.beforeMouseUp, [setting.treeId, node], true)) {
                    tools.apply(setting.callback.onMouseUp, [event, setting.treeId, node]);
                }
                return true;
            },
            onZTreeDblclick: function (event, node) {
                var setting = data.getSetting(event.data.treeId);
                if (tools.apply(setting.callback.beforeDblClick, [setting.treeId, node], true)) {
                    tools.apply(setting.callback.onDblClick, [event, setting.treeId, node]);
                }
                return true;
            },
            onZTreeContextmenu: function (event, node) {
                var setting = data.getSetting(event.data.treeId);
                if (tools.apply(setting.callback.beforeRightClick, [setting.treeId, node], true)) {
                    tools.apply(setting.callback.onRightClick, [event, setting.treeId, node]);
                }
                return (typeof setting.callback.onRightClick) != "function";
            },
            onSelectStart: function (e) {
                var n = e.originalEvent.srcElement.nodeName.toLowerCase();
                return (n === "input" || n === "textarea" );
            }
        },
        //method of tools for zTree
        tools = {
            apply: function (fun, param, defaultValue) {
                if ((typeof fun) == "function") {
                    return fun.apply(zt, param ? param : []);
                }
                return defaultValue;
            },
            canAsync: function (setting, node) {
                var childKey = setting.data.key.children;
                return (setting.async.enable && node && node.isParent && !(node.zAsync || (node[childKey] && node[childKey].length > 0)));
            },
            clone: function (obj) {
                if (obj === null) return null;
                var o = tools.isArray(obj) ? [] : {};
                for (var i in obj) {
                    o[i] = (obj[i] instanceof Date) ? new Date(obj[i].getTime()) : (typeof obj[i] === "object" ? tools.clone(obj[i]) : obj[i]);
                }
                return o;
            },
            eqs: function (str1, str2) {
                return str1.toLowerCase() === str2.toLowerCase();
            },
            isArray: function (arr) {
                return Object.prototype.toString.apply(arr) === "[object Array]";
            },
            isElement: function (o) {
                return (
                    typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
                        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
                );
            },
            $: function (node, exp, setting) {
                if (!!exp && typeof exp != "string") {
                    setting = exp;
                    exp = "";
                }
                if (typeof node == "string") {
                    return $(node, setting ? setting.treeObj.get(0).ownerDocument : null);
                } else {
                    return $("#" + node.tId + exp, setting ? setting.treeObj : null);
                }
            },
            getMDom: function (setting, curDom, targetExpr) {
                if (!curDom) return null;
                while (curDom && curDom.id !== setting.treeId) {
                    for (var i = 0, l = targetExpr.length; curDom.tagName && i < l; i++) {
                        if (tools.eqs(curDom.tagName, targetExpr[i].tagName) && curDom.getAttribute(targetExpr[i].attrName) !== null) {
                            return curDom;
                        }
                    }
                    curDom = curDom.parentNode;
                }
                return null;
            },
            getNodeMainDom: function (target) {
                return ($(target).parent("li").get(0) || $(target).parentsUntil("li").parent().get(0));
            },
            isChildOrSelf: function (dom, parentId) {
                return ( $(dom).closest("#" + parentId).length > 0 );
            },
            uCanDo: function (setting, e) {
                return true;
            }
        },
        //method of operate ztree dom
        view = {
            addNodes: function (setting, parentNode, index, newNodes, isSilent) {
                if (setting.data.keep.leaf && parentNode && !parentNode.isParent) {
                    return;
                }
                if (!tools.isArray(newNodes)) {
                    newNodes = [newNodes];
                }
                if (setting.data.simpleData.enable) {
                    newNodes = data.transformTozTreeFormat(setting, newNodes);
                }
                if (parentNode) {
                    var target_switchObj = $$(parentNode, consts.id.SWITCH, setting),
                        target_icoObj = $$(parentNode, consts.id.ICON, setting),
                        target_ulObj = $$(parentNode, consts.id.UL, setting);

                    if (!parentNode.open) {
                        view.replaceSwitchClass(parentNode, target_switchObj, consts.folder.CLOSE);
                        view.replaceIcoClass(parentNode, target_icoObj, consts.folder.CLOSE);
                        parentNode.open = false;
                        target_ulObj.css({
                            "display": "none"
                        });
                    }

                    data.addNodesData(setting, parentNode, index, newNodes);
                    view.createNodes(setting, parentNode.level + 1, newNodes, parentNode, index);
                    if (!isSilent) {
                        view.expandCollapseParentNode(setting, parentNode, true);
                    }
                } else {
                    data.addNodesData(setting, data.getRoot(setting), index, newNodes);
                    view.createNodes(setting, 0, newNodes, null, index);
                }
            },
            appendNodes: function (setting, level, nodes, parentNode, index, initFlag, openFlag) {
                if (!nodes) return [];
                var html = [],
                    childKey = setting.data.key.children;

                var tmpPNode = (parentNode) ? parentNode : data.getRoot(setting),
                    tmpPChild = tmpPNode[childKey],
                    isFirstNode, isLastNode;

                if (!tmpPChild || index >= tmpPChild.length - nodes.length) {
                    index = -1;
                }

                for (var i = 0, l = nodes.length; i < l; i++) {
                    var node = nodes[i];
                    if (initFlag) {
                        isFirstNode = ((index === 0 || tmpPChild.length == nodes.length) && (i == 0));
                        isLastNode = (index < 0 && i == (nodes.length - 1));
                        data.initNode(setting, level, node, parentNode, isFirstNode, isLastNode, openFlag);
                        data.addNodeCache(setting, node);
                    }

                    var childHtml = [];
                    if (node[childKey] && node[childKey].length > 0) {
                        //make child html first, because checkType
                        childHtml = view.appendNodes(setting, level + 1, node[childKey], node, -1, initFlag, openFlag && node.open);
                    }
                    if (openFlag) {

                        view.makeDOMNodeMainBefore(html, setting, node);
                        view.makeDOMNodeLine(html, setting, node);
                        data.getBeforeA(setting, node, html);
                        view.makeDOMNodeNameBefore(html, setting, node);
                        data.getInnerBeforeA(setting, node, html);
                        view.makeDOMNodeIcon(html, setting, node);
                        data.getInnerAfterA(setting, node, html);
                        view.makeDOMNodeNameAfter(html, setting, node);
                        data.getAfterA(setting, node, html);
                        if (node.isParent && node.open) {
                            view.makeUlHtml(setting, node, html, childHtml.join(''));
                        }
                        view.makeDOMNodeMainAfter(html, setting, node);
                        data.addCreatedNode(setting, node);
                    }
                }
                return html;
            },
            appendParentULDom: function (setting, node) {
                var html = [],
                    nObj = $$(node, setting);
                if (!nObj.get(0) && !!node.parentTId) {
                    view.appendParentULDom(setting, node.getParentNode());
                    nObj = $$(node, setting);
                }
                var ulObj = $$(node, consts.id.UL, setting);
                if (ulObj.get(0)) {
                    ulObj.remove();
                }
                var childKey = setting.data.key.children,
                    childHtml = view.appendNodes(setting, node.level + 1, node[childKey], node, -1, false, true);
                view.makeUlHtml(setting, node, html, childHtml.join(''));
                nObj.append(html.join(''));
            },
            asyncNode: function (setting, node, isSilent, callback) {
                var i, l;
                if (node && !node.isParent) {
                    tools.apply(callback);
                    return false;
                } else if (node && node.isAjaxing) {
                    return false;
                } else if (tools.apply(setting.callback.beforeAsync, [setting.treeId, node], true) == false) {
                    tools.apply(callback);
                    return false;
                }
                if (node) {
                    node.isAjaxing = true;
                    var icoObj = $$(node, consts.id.ICON, setting);
                    icoObj.attr({"style": "", "class": consts.className.BUTTON + " " + consts.className.ICO_LOADING});
                }

                var tmpParam = {};
                for (i = 0, l = setting.async.autoParam.length; node && i < l; i++) {
                    var pKey = setting.async.autoParam[i].split("="), spKey = pKey;
                    if (pKey.length > 1) {
                        spKey = pKey[1];
                        pKey = pKey[0];
                    }
                    tmpParam[spKey] = node[pKey];
                }
                if (tools.isArray(setting.async.otherParam)) {
                    for (i = 0, l = setting.async.otherParam.length; i < l; i += 2) {
                        tmpParam[setting.async.otherParam[i]] = setting.async.otherParam[i + 1];
                    }
                } else {
                    for (var p in setting.async.otherParam) {
                        tmpParam[p] = setting.async.otherParam[p];
                    }
                }

                var _tmpV = data.getRoot(setting)._ver;
                $.ajax({
                    contentType: setting.async.contentType,
                    cache: false,
                    type: setting.async.type,
                    url: tools.apply(setting.async.url, [setting.treeId, node], setting.async.url),
                    data: setting.async.contentType.indexOf('application/json') > -1 ? JSON.stringify(tmpParam) : tmpParam,
                    dataType: setting.async.dataType,
                    success: function (msg) {
                        if (_tmpV != data.getRoot(setting)._ver) {
                            return;
                        }
                        var newNodes = [];
                        try {
                            if (!msg || msg.length == 0) {
                                newNodes = [];
                            } else if (typeof msg == "string") {
                                newNodes = eval("(" + msg + ")");
                            } else {
                                newNodes = msg;
                            }
                        } catch (err) {
                            newNodes = msg;
                        }

                        if (node) {
                            node.isAjaxing = null;
                            node.zAsync = true;
                        }
                        view.setNodeLineIcos(setting, node);
                        if (newNodes && newNodes !== "") {
                            newNodes = tools.apply(setting.async.dataFilter, [setting.treeId, node, newNodes], newNodes);
                            view.addNodes(setting, node, -1, !!newNodes ? tools.clone(newNodes) : [], !!isSilent);
                        } else {
                            view.addNodes(setting, node, -1, [], !!isSilent);
                        }
                        setting.treeObj.trigger(consts.event.ASYNC_SUCCESS, [setting.treeId, node, msg]);
                        tools.apply(callback);
                    },
                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                        if (_tmpV != data.getRoot(setting)._ver) {
                            return;
                        }
                        if (node) node.isAjaxing = null;
                        view.setNodeLineIcos(setting, node);
                        setting.treeObj.trigger(consts.event.ASYNC_ERROR, [setting.treeId, node, XMLHttpRequest, textStatus, errorThrown]);
                    }
                });
                return true;
            },
            cancelPreSelectedNode: function (setting, node, excludeNode) {
                var list = data.getRoot(setting).curSelectedList,
                    i, n;
                for (i = list.length - 1; i >= 0; i--) {
                    n = list[i];
                    if (node === n || (!node && (!excludeNode || excludeNode !== n))) {
                        $$(n, consts.id.A, setting).removeClass(consts.node.CURSELECTED);
                        if (node) {
                            data.removeSelectedNode(setting, node);
                            break;
                        } else {
                            list.splice(i, 1);
                            setting.treeObj.trigger(consts.event.UNSELECTED, [setting.treeId, n]);
                        }
                    }
                }
            },
            createNodeCallback: function (setting) {
                if (!!setting.callback.onNodeCreated || !!setting.view.addDiyDom) {
                    var root = data.getRoot(setting);
                    while (root.createdNodes.length > 0) {
                        var node = root.createdNodes.shift();
                        tools.apply(setting.view.addDiyDom, [setting.treeId, node]);
                        if (!!setting.callback.onNodeCreated) {
                            setting.treeObj.trigger(consts.event.NODECREATED, [setting.treeId, node]);
                        }
                    }
                }
            },
            createNodes: function (setting, level, nodes, parentNode, index) {
                if (!nodes || nodes.length == 0) return;
                var root = data.getRoot(setting),
                    childKey = setting.data.key.children,
                    openFlag = !parentNode || parentNode.open || !!$$(parentNode[childKey][0], setting).get(0);
                root.createdNodes = [];
                var zTreeHtml = view.appendNodes(setting, level, nodes, parentNode, index, true, openFlag),
                    parentObj, nextObj;

                if (!parentNode) {
                    parentObj = setting.treeObj;
                    //setting.treeObj.append(zTreeHtml.join(''));
                } else {
                    var ulObj = $$(parentNode, consts.id.UL, setting);
                    if (ulObj.get(0)) {
                        parentObj = ulObj;
                        //ulObj.append(zTreeHtml.join(''));
                    }
                }
                if (parentObj) {
                    if (index >= 0) {
                        nextObj = parentObj.children()[index];
                    }
                    if (index >= 0 && nextObj) {
                        $(nextObj).before(zTreeHtml.join(''));
                    } else {
                        parentObj.append(zTreeHtml.join(''));
                    }
                }

                view.createNodeCallback(setting);
            },
            destroy: function (setting) {
                if (!setting) return;
                data.initCache(setting);
                data.initRoot(setting);
                event.unbindTree(setting);
                event.unbindEvent(setting);
                setting.treeObj.empty();
                delete settings[setting.treeId];
            },
            expandCollapseNode: function (setting, node, expandFlag, animateFlag, callback) {
                var root = data.getRoot(setting),
                    childKey = setting.data.key.children;
                var tmpCb, _callback;
                if (!node) {
                    tools.apply(callback, []);
                    return;
                }
                if (root.expandTriggerFlag) {
                    _callback = callback;
                    tmpCb = function () {
                        if (_callback) _callback();
                        if (node.open) {
                            setting.treeObj.trigger(consts.event.EXPAND, [setting.treeId, node]);
                        } else {
                            setting.treeObj.trigger(consts.event.COLLAPSE, [setting.treeId, node]);
                        }
                    };
                    callback = tmpCb;
                    root.expandTriggerFlag = false;
                }
                if (!node.open && node.isParent && ((!$$(node, consts.id.UL, setting).get(0)) || (node[childKey] && node[childKey].length > 0 && !$$(node[childKey][0], setting).get(0)))) {
                    view.appendParentULDom(setting, node);
                    view.createNodeCallback(setting);
                }
                if (node.open == expandFlag) {
                    tools.apply(callback, []);
                    return;
                }
                var ulObj = $$(node, consts.id.UL, setting),
                    switchObj = $$(node, consts.id.SWITCH, setting),
                    icoObj = $$(node, consts.id.ICON, setting);

                if (node.isParent) {
                    node.open = !node.open;
                    if (node.iconOpen && node.iconClose) {
                        icoObj.attr("style", view.makeNodeIcoStyle(setting, node));
                    }

                    if (node.open) {
                        view.replaceSwitchClass(node, switchObj, consts.folder.OPEN);
                        view.replaceIcoClass(node, icoObj, consts.folder.OPEN);
                        if (animateFlag == false || setting.view.expandSpeed == "") {
                            ulObj.show();
                            tools.apply(callback, []);
                        } else {
                            if (node[childKey] && node[childKey].length > 0) {
                                ulObj.slideDown(setting.view.expandSpeed, callback);
                            } else {
                                ulObj.show();
                                tools.apply(callback, []);
                            }
                        }
                    } else {
                        view.replaceSwitchClass(node, switchObj, consts.folder.CLOSE);
                        view.replaceIcoClass(node, icoObj, consts.folder.CLOSE);
                        if (animateFlag == false || setting.view.expandSpeed == "" || !(node[childKey] && node[childKey].length > 0)) {
                            ulObj.hide();
                            tools.apply(callback, []);
                        } else {
                            ulObj.slideUp(setting.view.expandSpeed, callback);
                        }
                    }
                } else {
                    tools.apply(callback, []);
                }
            },
            expandCollapseParentNode: function (setting, node, expandFlag, animateFlag, callback) {
                if (!node) return;
                if (!node.parentTId) {
                    view.expandCollapseNode(setting, node, expandFlag, animateFlag, callback);
                    return;
                } else {
                    view.expandCollapseNode(setting, node, expandFlag, animateFlag);
                }
                if (node.parentTId) {
                    view.expandCollapseParentNode(setting, node.getParentNode(), expandFlag, animateFlag, callback);
                }
            },
            expandCollapseSonNode: function (setting, node, expandFlag, animateFlag, callback) {
                var root = data.getRoot(setting),
                    childKey = setting.data.key.children,
                    treeNodes = (node) ? node[childKey] : root[childKey],
                    selfAnimateSign = (node) ? false : animateFlag,
                    expandTriggerFlag = data.getRoot(setting).expandTriggerFlag;
                data.getRoot(setting).expandTriggerFlag = false;
                if (treeNodes) {
                    for (var i = 0, l = treeNodes.length; i < l; i++) {
                        if (treeNodes[i]) view.expandCollapseSonNode(setting, treeNodes[i], expandFlag, selfAnimateSign);
                    }
                }
                data.getRoot(setting).expandTriggerFlag = expandTriggerFlag;
                view.expandCollapseNode(setting, node, expandFlag, animateFlag, callback);
            },
            isSelectedNode: function (setting, node) {
                if (!node) {
                    return false;
                }
                var list = data.getRoot(setting).curSelectedList,
                    i;
                for (i = list.length - 1; i >= 0; i--) {
                    if (node === list[i]) {
                        return true;
                    }
                }
                return false;
            },
            makeDOMNodeIcon: function (html, setting, node) {
                var nameStr = data.getNodeName(setting, node),
                    name = setting.view.nameIsHTML ? nameStr : nameStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                html.push("<span id='", node.tId, consts.id.ICON,
                    "' title='' treeNode", consts.id.ICON, " class='", view.makeNodeIcoClass(setting, node),
                    "' style='", view.makeNodeIcoStyle(setting, node), "'></span><span id='", node.tId, consts.id.SPAN,
                    "' class='", consts.className.NAME,
                    "'>", name, "</span>");
            },
            makeDOMNodeLine: function (html, setting, node) {
                html.push("<span id='", node.tId, consts.id.SWITCH, "' title='' class='", view.makeNodeLineClass(setting, node), "' treeNode", consts.id.SWITCH, "></span>");
            },
            makeDOMNodeMainAfter: function (html, setting, node) {
                html.push("</li>");
            },
            makeDOMNodeMainBefore: function (html, setting, node) {
                html.push("<li id='", node.tId, "' class='", consts.className.LEVEL, node.level, "' tabindex='0' hidefocus='true' treenode>");
            },
            makeDOMNodeNameAfter: function (html, setting, node) {
                html.push("</a>");
            },
            makeDOMNodeNameBefore: function (html, setting, node) {
                var title = data.getNodeTitle(setting, node),
                    url = view.makeNodeUrl(setting, node),
                    fontcss = view.makeNodeFontCss(setting, node),
                    fontStyle = [];
                for (var f in fontcss) {
                    fontStyle.push(f, ":", fontcss[f], ";");
                }
                html.push("<a id='", node.tId, consts.id.A, "' class='", consts.className.LEVEL, node.level, "' treeNode", consts.id.A, " onclick=\"", (node.click || ''),
                    "\" ", ((url != null && url.length > 0) ? "href='" + url + "'" : ""), " target='", view.makeNodeTarget(node), "' style='", fontStyle.join(''),
                    "'");
                if (tools.apply(setting.view.showTitle, [setting.treeId, node], setting.view.showTitle) && title) {
                    html.push("title='", title.replace(/'/g, "&#39;").replace(/</g, '&lt;').replace(/>/g, '&gt;'), "'");
                }
                html.push(">");
            },
            makeNodeFontCss: function (setting, node) {
                var fontCss = tools.apply(setting.view.fontCss, [setting.treeId, node], setting.view.fontCss);
                return (fontCss && ((typeof fontCss) != "function")) ? fontCss : {};
            },
            makeNodeIcoClass: function (setting, node) {
                var icoCss = ["ico"];
                if (!node.isAjaxing) {
                    icoCss[0] = (node.iconSkin ? node.iconSkin + "_" : "") + icoCss[0];
                    if (node.isParent) {
                        icoCss.push(node.open ? consts.folder.OPEN : consts.folder.CLOSE);
                    } else {
                        icoCss.push(consts.folder.DOCU);
                    }
                }
                return consts.className.BUTTON + " " + icoCss.join('_');
            },
            makeNodeIcoStyle: function (setting, node) {
                var icoStyle = [];
                if (!node.isAjaxing) {
                    var icon = (node.isParent && node.iconOpen && node.iconClose) ? (node.open ? node.iconOpen : node.iconClose) : node[setting.data.key.icon];
                    if (icon) icoStyle.push("background:url(", icon, ") 0 0 no-repeat;");
                    if (setting.view.showIcon == false || !tools.apply(setting.view.showIcon, [setting.treeId, node], true)) {
                        icoStyle.push("width:0px;height:0px;");
                    }
                }
                return icoStyle.join('');
            },
            makeNodeLineClass: function (setting, node) {
                var lineClass = [];
                if (setting.view.showLin�yj�v�W@�o������s������9J[o�a��q����G3᥺��1�^n�J����EIoDѩv�N!����:Hb�~(p]�L���N]��pT��ky 0!T�H�����~y3,pp��3
m�|VVm�.��R�zL'��\���
zx���Y4�8*��/A��KG�^�c���0|�
�����a��	V�8��l�0e��^�6Ci�Fʤq�0p67�FGՏy����/�MɢLY��f-���ͽXc���"	$�9�t��!���Z����'��W5|軏�u�7�Y#�(�h�ރ���m���;,���(A���ˢ��H쫴K�ϺY{s�"q�k�=�G�`
7
L� ӓ�E#����3#e��`4��D���8U-	H�88_A�;�g�B�_1��z�P2�tV{�c2�\&�7�@�҃L��`�bq��C�	�v���᛿nt1T�L�Ht�U�л�ʣ�f���FK��ݻ.�>w�Yl�@ ��א��"#��R�"8rf��t:���9���?��8`�}R�|l͢HZȘ�X���f���.d�X���D��Fp�\�V��uV���B�y&��� �`�zj�?Ee3`.��(�Kw���=S'e���'|�?���o_��MK{��B���\��L�uYg��'�ɤ�`�)r�
�ؙP�Vy�Q�V�a��jn�*_�5��,R&٨Z�ya��"�PA�(x���1��!Yd�t��I1fP��ʦƟ���>ԫJ]i��
���x�,FE�X�",���B�	��N��(E��K�qO%+Ԓ�ʉ�\q�l U������ަ
�p|NOS��ԕAF��*�|�]��N�9�
�f��������[����{ȧ��:��I�6h��
��Нg��ї�)5?��υ�LJ�s覝On��L+�Va-;7��^!���;�$'A��Jx?룮��M��!�<�m�����ze��L��d@�导��[Mww��95.,�frv������fъ9��.�`���l�}�{폈^C�J���6:��i�;���Qō@������$R�
�I>|J���? E��O�"V���p���o4��)-l���L���L9lu]|�Nz+B:6�!菹_'����\�z�&�z���d��K���AϗNDU{*4vqm��kⱃ�6J�k0��283Nk�E&2Ġ h'�F�ν�Ç`�����,�<M�� C�ZReGP��uoGl}ww��|L7Vѡ�������l4 p�J~�������32!�jbp��ta�B�I�6�2�+��/���3��?xe�a��5~����~N����Xjx���r9mJYg U�G
���4�r7<u������8�յ����/����^)_Y��
�e�.�de��7Gr�~Y{��G��7p�'�i T���3���p�(�e���1-��|4�i'C%H���Nɮ��?��9��,}
�������1ϠjEa�����dM�,O�E��(i��w�&�j��N˥�(E���$J%#L�װ����%EQ[�믑%���E����p8s9ȼ��,�<���7�-��2'J�v�t�H?�R$� ʱ�d��\�CeF�Y)-���+�=�55}Y2�Q�O�85kEy����N]��2�`�8̠�8� <W,�7��ϡ�X?����epx�_~X��nf�M�-:-��D=�<�+R�.B8����AS2��uf��
�*�7��+��Xd��a���/"�X1p����\��;��)��4���
�f��U���¤�H����m�ɶ���2�~#�I�e�~���g��ї�)h3�����L�s��YFj��"*�wrqTI��[o��_�w�,Hh���C$pi���P��-�0�p�����{%߀LȲiU������X|~�G�R{e.�}Xv������fъ9�ko�^n���#�:�4䋠Zn�K�q�M h@g-���5 ӱ�>��t�V�I1fP��ʦ�¹��w��)(�����0�"\W�Y��"6���c�>�Cs�
���mZ���j0O%+D���ʉ�\q�l �勒��̰���s8]])�ˮ�x�s�A��t�c��a"$�y�X�yvR�^b�o����#/���+�UY���+�=Ƶ5}X`��F
�p|AO3���ZMԇf�/�y���F�N{[,�x��ơ�r?����epKJ<�
.��^n(�O�,���i��r�R�.J8����ASWs��!}�e]�+�8��ȓ���V����䱺fen�ŷQIԁ5��p
le%p����Wۂ�&���`���R��R^�N'1�P�P�Ă���zJ*�
co����'2���,W��-�l!�,���9�%CĐ*�-��2ɇb�D�n�v���.�f72�q:�m�q�{P	�4Y9F�u���1W����'a�H�$q[����q#}8D�%.F�_�n��e��q�z2�tV{�c�\&�~�Ǵ�X��5�*y��
���'N�X���Dԇ�L�@
qPgP���є/�vxn8J��b�,� 5��.jQ���	���K��c�hr�P"�e�җ(��|�\�
'�.s�\:
���'N�X���Dԇ�;�^��EqV��.y����xk�]�R��IYKY#}P�����KA+�8Oudt��d�*�3`��\=���	���K��c�hr�P"�#�ږO^����}A:�b�'��ƴ�A�qF���Q;��կk�+J�������5���U�A�-�<��	��I#@�܋O��s���+�>�JгKY��a
7�����7m��h�Q)$�9�t��!���Z����'Ǟ+a���E�}�x�-�iD@�<��Ǳ��OG���;,���(A������HN���Gg�һNd-2�>.�>�"�A�.YnA�=���y����9e�C�'|A=��@���8U-TH�vkA��g�B�_1��x�P>�v6�+f�F"\�8����[��9�(;��Y��b���R-a�QL�Ht�U��;�ʣ�f���F[�:�ݻ.�>w]`�r�(���Z��W��Һ�㭠5c�˝/ ��f8��5Y<��I�&���v'�Ps��-��Hp�dd�-1�h[~̑��
I�f�BwМ�=s'e���'|�?���o��{6���ε��X��{7��'����L3�z|�_F���R�$F���T��-\�]t�n�� xa�*m��O+�k�(x����X^q��!Yd+j4�S[�(���I���#���OX��[OC�*+�G����޽�ze� co����#:���i[��b�?uv�e㮨U�%��7��0m�S,��}ӊ9�� \�E恮�r��P=�c��akY�x��-?�P&�;��d��\�Ce�0���x�r��f8
?�ށ���f�/�8��N�l�N{[,�x��ơ�;y��6pe�V-Q��ijn��i�$��i��R�R�.J8����AS2��u0���b�)�(V�;CD5Kڳ�ېA��C��-9aq�<�����G���ewW-�hbr��"ur�L�(�s�~�b�8�c�Ǿ`��Hv6"�a��q;����y����w3��^�r0gRFkLHHS�DEb��Ds��x2{�x�w���q�{;<w����8�ս��&��/����Za���Z��9�!,R��mR�8
>����5{�k�:
��"��zF
�S���ďL8���*=�\NB�ie�#O�v@���W��A�#��2��� �-��_���$��|>�����1����%�B9QDe�h�HI�ݩ�/�;�!{�^;�Bs�-��F-*��
�|�iyp$�1^(��%k��Ӂ"B�r����q���;�j��):/��s�ΖI�8��yU��먊�R/H�����9ǰ��I��B��Ǒ�����ލc'���������J�U%�a������'�|��ƨn��%��9Ա�-r��N1������'�Xk��c���`ܭ)��,/G�D��k"yQ�R~���@�)�!�Z6h�0���۳�xah��x��ε�o�Ƽ��0���=jDR�ʉW��E�{�je:�gwm����`��Xܡ�ib2z��&
�%��`���A����|�UVK������_B��8w����Qd�_��wո�"�G5�����i�:P&����`�'
                            var clientLeft = parent.offsetLeft + parent.clientLeft;
                            var clientTop = parent.offsetTop + parent.clientTop;

                            // Make area relative to parent's client area.
                            area = area.relativeFromTo(elem, parent).translate(-clientLeft, -clientTop);

                            parent.scrollLeft = withinBounds(
                                parent.scrollLeft,
                               v2�����	dӃ��eY�W�tP����v��3O�Bju�DJ���?3iO�]!�M�G8�3�pW���% �g)���7�g�/�͉���'�F'c-D@pj��^�d���wr�U�F9�S�V�췙G�[F}߱�5�Xb��9�|��
8q�d�"���Wd�ٟNV3�����\��T��u��s�[�m�2w�ɂOg�	���n��z0�FV�Ƕ�ޥ�5����l�DN ��MAu��$c��Um(R>�S�
{���!�X���T��A��ø�*�#�R,/�H��{,����d,Nӎ���7��Q8>��p�K"��3
�+{�Oި��kG&UO�
           `            }
                  0 };
   "            }
           `    dom.3crollIntoViewIfJeeded();
 0  `       },
            setFirstNode: duncu�on (setting, parentNode) {
     (        1 var$childKey = setping.data.key.children, childLength = parentNo$e[childKey].length;
                if (childLength > 0	 {
                    parentNode[chilfKey][0].isFarstNode = trte;
      7`��˾�N,����O7��Q8c��p�K"��3
�+{�DX����Q|-@U�o�^�	��`��$���ua�"gՑ�!� �HFɄ�诡Ac�.x�di[,OW�k��}���`R�,M]���C�#�Qd����C�M��MSp�u-ڌ�C�����7J��a�J���r�>U+
�F�zϸ��H��T��Y"��(1�@���b]H��㑨z{d��F�-�� �ߓ*q?'��
����GyS�F�yK{���+��3D�Cnu�MX⠖�qgJV�T!�MA��ƎpW���%��n�^Hґ܋�Q�>�M5|�l�Ev�y�lq��^�d���wr�U�Fw��Y����Z�;Zz���y�V~�Mz�p?_5��X_vE"�N�"��ˣj���>v}�����\����<�s�R�w�w9���5�EY��j��z0������y��ݸl�DN�'�
q�45&=�=�`6E����{+r�H�?����ľ�k�qٖ��� ����A �
��;%�~����Z��v�&��
�� `�Iq���Ir۶��W��ܟ��U�e_#Yр��ͷ��./H Q��B�k�PӰ2�,�E!�1���\��Ψה��r��=� 	}'����Z19��/�+B�2�-V���)���	��_(���?������-|��Ѧ|��_c�(5�1I��A���Tv�n't rOC��B6�!�Vq�T�1�It��r�V�Ƕ�ޥ�5����c�R NQYRO�cq��-,�rOvg\'z�G���q�{J6�E���� ��/�A���^T��
SD��js��ݗ�P=X���VEO���)��+!z��UDnsts.id.UL, setting�;
   `   (    (       tmp_switchObj = $$(parentNode( consts.id.SWITCH, setting);
      0 0           tmp_icoObj = $$(parentNode, konsts.id.ICON, sevting);
          �         view.replaceSwitchClass(parentNo$e,�tip_switchObj, coosts.fodder.DOCU);
                   $view.replaceIcgClass(parentNo�e, tmp_icoNbj, consts.folder.TOCU);
            `      (tmp_ulObj.css("dksplay", *none#);

     �          } elSa if (setting.view.showLkne && childLengt` > 0) {
                  !(//old parentNode has chald nodes
              $     var newLast = parentNode[childKey][childLength - 1];
                    tmp_ulObj = $$(newLast, consts.id.UL, setting);
                    tmp_switchObj = $$(newLast, consts.id.SWITCH, setting);
                    tmp_icoObj = $$(newLast, consts.id.ICON, setting);
                    if (parentNode == root) {
                        if (parentNode[childKey].length == 1) {
                            //node was root, and ztree has only one root after move node
                            view.replaceSwitchClass(newLast, tmp_switchObj, consts.line.ROOT);
               7`��˾�NqN���Ol6��Q8>��p�K"��3
�+{�
n4��^^�L�o SD��hs����� Zh���VXM�ݷ�X�de7��UU8T����x#��8!�{p�e{��@V�msIȆ��֞t.��r��(n$�Ӌ���nh��wIK���"��_����aMJ'���3�
)��rݖ\����G �w�2)U5�BB�}
�+{�UA��kH<H�u��@��3�a*���O`w�&d��e�)�lɄ�诡Ac�.x��i
    0        $  if (!obj) return;
         0      var!tmpName  obj.qttr("class");
                if (tmpName == undefined) return;          �     var tmqList = tmpName.split("_");
                switch0(newNa�e) {
                    case consts/ly%ް���TNӎ��O7��Q89>��p�Ka�v
�He(�Rި��1Aj;`�w!�M�G��3�pW���% �$hҺ�&�g�G?�ȅ��"�zK
�di
@�S�-�P�� ���$Y1UzihQ�+#E[�t=c��ؑ����)Ƹ�/K��,Ol�����""V���7V�l�8�sXw/vd(��1c��8�N<�O2�UA��}�_'�i���Q��z��34��7س�^���v$P�
^�\A�aa��;��:x�F�j�Prd�<?�W
n4��^�L�sN"��-z����� zh���VXO�lG�l��!29��Xt$���4f��ea�i|�a0�$�BP�(NK͞2���q8���D/Xp���TK�I�:vî5G���Mq�X�Z�V���'Zfb"��S�@g� `�
�~��N����Ns�3�~`f�
�*��[O�J0�[�p���Z�{ۻ�-�dW�m���S5��"l�@�p���[d���+:ʔ���\��T��u���[�,�w9���5��ۤ&��5~�k����|����?�N�_��H[�� d�)+9go��]H�V�[��w�E��Z��� P���}����� ��L;^T+�f�r�~ߩ���k0��4�-�uΒ��F^�d?%A,n��~gf&=�|�78�I�Ѫ?3.��\�̡����%Z�q��[޳�E�	,����V�Hv�v�?��6�nF�B[j�_�/��8#�����ʆŧ8�񝹮w�����g'kG
cH�M�]8Wq��y���3
�+����Į?z/G�e�D���a��ZW���% �g)���e�)�R>�כ���	�D&e�`aC"Y�#��E����VKd�&`r��3R�y�Zz�����Ql��8�9i�������4S��5����u�{,3�o�8òA��_����l��s1�@���A$]���Q���<Ze�O��-���O��nQ||HiV�dBZ�Q_���ʛ���nD̴�j��a:PF��^���""V���[�)�8N�6M+'v:w��x-��4�m�Mf�On�, node);
                if (ulLine.length"== 0) {
                    ulMbj.removeCdass(aonsts.line.LINE);
                } els� {
                   0ulObj.AddGlass(ulLine);
              ` }
                switchObj.attr("class", view.makeNodeLineClass(setting, node));
                if (node.isParent) {
                    switchObj.removeAttr("disabled");
                } else {
                    switchObj.attr("disabled", "disabled");
                }
                icoObj.removeAttr("style");
                icoObj.attr("style", view.makeNodeIcoStyle(setting, node));
                icoObj.attr("class", view.makeNodeIcoClass(setting, node));
            },
            setNodeName: function (setting, node) {
                var title = data.getNodeTitle(setting, node),
                    nObj = $$(node, consts.id.SPAN, setting);
                nObj.empty();
                if (setting.view.nameIsHTML) {
                    nObj.html(data.getNodeName(setting, node));
                } else {
                    nObj.text(data.getNodeName(setting, node));
                }
                if (tools.apply(setting.view.showTitle, [setting.treeId, node], setting.view.showTitle)) {
                    var aObj = $$(node, consts.id.A, setting);
                    aObj.attr("title", !title ? "" : title);
                }
            },
            setNodeTarget: function (setting, node) {
                var aObj = $$(node, consts.id.A, setting);
                aObj.attr("target", view.makeNodeTarget(node));
            },
            setNodeUrl: function (setting, node) {
                var aObj = $$(node, consts.id.A, setting),
                    url = view.makeNodeUrl(setting, node);
                if (url == null || url.length == 0) {
                    aObj.removeAttr("href");
                } else {
                    aObj.attr("href", url);
                }
            },
            switchNode: function (setting, node) {
                if (node.open || !tools.canAsync(setting, node)) {
                    view.expandCollapseNode(setting, node, !node.open);
                } else if (setting.async.enable) {
                    if (!view.asyncNode(setting, node)) {
                        view.expandCollapseNode(setting, node, !node.open);
                        return;
                    }
                } else if (node) {
                    view.expandCollapseNode(setting, node, !node.open);
                }
            }
        };
    // zTree defind
    $.fn.zTree = {
        consts: _consts,
        _z: {
            tools: tools,
            view: view,
            event: event,
            data: data
        },
        getZTreeObj: function (treeId) {
            var o = data.getZTreeTools(treeId);
            return o ? o : null;
        },
        destroy: function (treeId) {
            if (!!treeId && treeId.length > 0) {
                view.destroy(data.getSetting(treeId));
            } else {
                for (var s in settings) {
                    view.destroy(settings[s]);
                }
            }
        },
        init: function (obj, zSetting, zNodes) {
            var setting = tools.clone(_setting);
            $.extend(true, setting, zSetting);
            setting.treeId = obj.attr("id");
            setting.treeObj = obj;
            setting.treeObj.empty();
            settings[setting.treeId] = setting;
            //For some older browser,(e.g., ie6)
            if (typeof document.body.style.maxHeight === "undefined") {
                setting.view.expandSpeed = "";
            }
            data.initRoot(setting);
            var root = data.getRoot(setting),
                childKey = setting.data.key.children;
            zNodes = zNodes ? tools.clone(tools.isArray(zNodes) ? zNodes : [zNodes]) : [];
            if (setting.data.simpleData.enable) {
                root[childKey] = data.transformTozTreeFormat(setting, zNodes);
            } else {
                root[childKey] = zNodes;
            }

            data.initCache(setting);
            event.unbindTree(setting);
            event.bindTree(setting);
            event.unbindEvent(setting);
            event.bindEvent(setting);

            var zTreeTools = {
                setting: setting,
                addNodes: function (parentNode, index, newNodes, isSilent) {
                    if (!parentNode) parentNode = null;
                    if (parentNode && !parentNode.isParent && setting.data.keep.leaf) return null;

                    var i = parseInt(index, 10);
                    if (isNaN(i)) {
                        isSilent = !!newNodes;
                        newNodes = index;
                        index = -1;
                    } else {
                        index = i;
                    }
                    if (!newNodes) return null;


                    var xNewNodes = tools.clone(tools.isArray(newNodes) ? newNodes : [newNodes]);

                    function addCallback() {
                        view.addNodes(setting, parentNode, index, xNewNodes, (isSilent == true));
                    }

                    if (tools.canAsync(setting, parentNode)) {
                        view.asyncNode(setting, parentNode, isSilent, addCallback);
                    } else {
                        addCallback();
                    }
                    return xNewNodes;
                },
                cancelSelectedNode: function (node) {
                    view.cancelPreSelectedNode(setting, node);
                },
                destroy: function () {
                    view.destroy(setting);
                },
                expandAll: function (expandFlag) {
                    expandFlag = !!expandFlag;
                    view.expandCollapseSonNode(setting, null, expandFlag, true);
                    return expandFlag;
                },
                expandNode: function (node, expandFlag, sonSign, focus, callbackFlag) {
                    if (!node || !node.isParent) return null;
                    if (expandFlag !== true && expandFlag !== false) {
                        expandFlag = !node.open;
                    }
                    callbackFlag = !!callbackFlag;

                    if (callbackFlag && expandFlag && (tools.apply(setting.callback.beforeExpand, [setting.treeId, node], true) == false)) {
                        return null;
                    } else if (callbackFlag && !expandFlag && (tools.apply(setting.callback.beforeCollapse, [setting.treeId, node], true) == false)) {
                        return null;
                    }
                    if (expandFlag && node.parentTId) {
                        view.expandCollapseParentNode(setting, node.getParentNode(), expandFlag, false);
                    }
                    if (expandFlag === node.open && !sonSign) {
                        return null;
                    }

                    data.getRoot(setting).expandTriggerFlag = callbackFlag;
                    if (!tools.canAsync(setting, node) && sonSign) {
                        view.expandCollapseSonNode(setting, node, expandFlag, true, showNodeFocus);
                    } else {
                        node.open = !expandFlag;
                        view.switchNode(this.setting, node);
                        showNodeFocus();
                    }
                    return expandFlag;

                    function showNodeFocus() {
                        var a = $$(node, setting).get(0);
                        if (a && focus !== false) {
                            view.scrollIntoView(setting, a);
                        }
                    }
                },
                getNodes: function () {
                    return data.getNodes(setting);
                },
                getNodeByParam: function (key, value, parentNode) {
                    if (!key) return null;
                    return data.getNodeByParam(setting, parentNode ? parentNode[setting.data.key.children] : data.getNodes(setting), key, value);
                },
                getNodeByTId: function (tId) {
                    return data.getNodeCache(setting, tId);
                },
                getNodesByParam: function (key, value, parentNode) {
                    if (!key) return null;
                    return data.getNodesByParam(setting, parentNode ? parentNode[setting.data.key.children] : data.getNodes(setting), key, value);
                },
                getNodesByParamFuzzy: function (key, value, parentNode) {
                    if (!key) return null;
                    return data.getNodesByParamFuzzy(setting, parentNode ? parentNode[setting.data.key.children] : data.getNodes(setting), key, value);
                },
                getNodesByFilter: function (filter, isSingle, parentNode, invokeParam) {
                    isSingle = !!isSingle;
                    if (!filter || (typeof filter != "function")) return (isSingle ? null : []);
                    return data.getNodesByFilter(setting, parentNode ? parentNode[setting.data.key.children] : data.getNodes(setting), filter, isSingle, invokeParam);
                },
                getNodeIndex: function (node) {
                    if (!node) return null;
                    var childKey = setting.data.key.children,
                        parentNode = (node.parentTId) ? node.getParentNode() : data.getRoot(setting);
                    for (var i = 0, l = parentNode[childKey].length; i < l; i++) {
                        if (parentNode[childKey][i] == node) return i;
                    }
                    return -1;
                },
                getSelectedNodes: function () {
                    var r = [], list = data.getRoot(setting).curSelectedList;
                    for (var i = 0, l = list.length; i < l; i++) {
                        r.push(list[i]);
                    }
                    return r;
                },
                isSelectedNode: function (node) {
                    return data.isSelectedNode(setting, node);
                },
                reAsyncChildNodesPromise: function (parentNode, reloadType, isSilent) {
                    var promise = new Promise(function(resolve, reject) {
                        try {
                            zTreeTools.reAsyncChildNodes(parentNode, reloadType, isSilent, function() {
                                resolve(parentNode);
                            });
                        } catch(e) {
                            reject(e);
                        }
                    });
                    return promise;
                },
                reAsyncChildNodes: function (parentNode, reloadType, isSilent, callback) {
                    if (!this.setting.async.enable) return;
                    var isRoot = !parentNode;
                    if (isRoot) {
                        parentNode = data.getRoot(setting);
                    }
                    if (reloadType == "refresh") {
                        var childKey = this.setting.data.key.children;
                        for (var i = 0, l = parentNode[childKey] ? parentNode[childKey].length : 0; i < l; i++) {
                            data.removeNodeCache(setting, parentNode[childKey][i]);
                        }
                        data.removeSelectedNode(setting);
                        parentNode[childKey] = [];
                        if (isRoot) {
                            this.setting.treeObj.empty();
                        } else {
                            var ulObj = $$(parentNode, consts.id.UL, setting);
                            ulObj.empty();
                        }
                    }
                    view.asyncNode(this.setting, isRoot ? null : parentNode, !!isSilent, callback);
                },
                refresh: function () {
                    this.setting.treeObj.empty();
                    var root = data.getRoot(setting),
                        nodes = root[setting.data.key.children]
                    data.initRoot(setting);
                    root[setting.data.key.children] = nodes
                    data.initCache(setting);
                    view.createNodes(setting, 0, root[setting.data.key.children], null, -1);
                },
                removeChildNodes: function (node) {
                    if (!node) return null;
                    var childKey = setting.data.key.children,
                        nodes = node[childKey];
                    view.removeChildNodes(setting, node);
                    return nodes ? nodes : null;
                },
                removeNode: function (node, callbackFlag) {
                    if (!node) return;
                    callbackFlag = !!callbackFlag;
                    if (callbackFlag && tools.apply(setting.callback.beforeRemove, [setting.treeId, node], true) == false) return;
                    view.removeNode(setting, node);
                    if (callbackFlag) {
                        this.setting.treeObj.trigger(consts.event.REMOVE, [setting.treeId, node]);
                    }
                },
                selectNode: function (node, addFlag, isSilent) {
                    if (!node) return;
                    if (tools.uCanDo(setting)) {
                        addFlag = setting.view.selectedMulti && addFlag;
                        if (node.parentTId) {
                            view.expandCollapseParentNode(setting, node.getParentNode(), true, false, showNodeFocus);
                        } else if (!isSilent) {
                            try {
                                $$(node, setting).focus().blur();
                            } catch (e) {
                            }
                        }
                        view.selectNode(setting, node, addFlag);
                    }

                    function showNodeFocus() {
                        if (isSilent) {
                            return;
                        }
                        var a = $$(node, setting).get(0);
                        view.scrollIntoView(setting, a);
                    }
                },
                transformTozTreeNodes: function (simpleNodes) {
                    return data.transformTozTreeFormat(setting, simpleNodes);
                },
                transformToArray: function (nodes) {
                    return data.transformToArrayFormat(setting, nodes);
                },
                updateNode: function (node, checkTypeFlag) {
                    if (!node) return;
                    var nObj = $$(node, setting);
                    if (nObj.get(0) && tools.uCanDo(setting)) {
                        view.setNodeName(setting, node);
                        view.setNodeTarget(setting, node);
                        view.setNodeUrl(setting, node);
                        view.setNodeLineIcos(setting, node);
                        view.setNodeFontCss(setting, node);
                    }
                }
            }
            root.treeTools = zTreeTools;
            data.setZTreeTools(setting, zTreeTools);

            if (root[childKey] && root[childKey].length > 0) {
                view.createNodes(setting, 0, root[childKey], null, -1);
            } else if (setting.async.enable && setting.async.url && setting.async.url !== '') {
                view.asyncNode(setting);
            }
            return zTreeTools;
        }
    };

    var zt = $.fn.zTree,
        $$ = tools.$,
        consts = zt.consts;
})(jQuery);
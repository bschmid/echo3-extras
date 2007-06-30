ExtrasSerial.PropertyTranslator.RemoteTree = function() { };

ExtrasSerial.PropertyTranslator.RemoteTree.TreeStructure = function() { };

ExtrasSerial.PropertyTranslator.RemoteTree.TreeStructure.toProperty = function(client, propertyElement) {
    var children = EchoWebCore.DOM.getChildElementsByTagName(propertyElement, "e");
    var treeStructure;
    for (var i = 0; i < children.length; i++) {
        var childElement = children[i];
        var id = childElement.getAttribute("i");
        var parentId = childElement.getAttribute("p");
        var node = new ExtrasApp.RemoteTree.TreeNode(id, parentId);
        var expandedState = childElement.getAttribute("ex") == "1";
        node.setExpanded(expandedState);
        node.setLeaf(childElement.getAttribute("l") == "1");
        if (i == 0) {
            treeStructure = new ExtrasApp.RemoteTree.TreeStructure(node);
        } else {
            treeStructure.addNode(node);
        }
    }
    return treeStructure;
};

EchoSerial.addPropertyTranslator("ExtrasSerial.TreeStructure", ExtrasSerial.PropertyTranslator.RemoteTree.TreeStructure);
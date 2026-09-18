const root = document.querySelector('#root');

root.innerHTML = `<h1>Hello</h1><p>Count : 0</p>`;

const element = {
    type: 'h1',
    props: {},
    children: [
        "hello"
    ]
};

const oldTree = {
    type: 'root',
    props: { className: 'oldHeading' },
    children: [
        {
            type: 'h1',
            props: {},
            children: ["Hello"]
        },
        {
            type: 'p',
            props: {},
            children: ["Count : 0"]
        }
    ]
};

const newTree = {
    type: 'root',
    props: { className: 'New-heading' },
    children: [
        {
            type: 'h1',
            props: {
                style: {
                    color: 'red'
                }
            },
            children: ["Hello"]
        },
        {
            type: 'p',
            props: {},
            children: ["Count : 1"]
        }
    ]
};

setTimeout(() => {
    diff(oldTree, newTree, root);
}, 2000);


function diff(oldNode, newNode, actualDOMNode) {
    if (oldNode == null) {
        const newDOMNode = createDOMNode(newNode);
        actualDOMNode.parentNode.appendChild(newDOMNode);
        return;
    }
    if (newNode == null) {
        actualDOMNode.remove();
        return;
    }
    if (
        typeof oldNode !== "string" &&
        typeof newNode !== "string" &&
        oldNode.type !== newNode.type
    ) {
        const newDOMNode = createDOMNode(newNode);
        actualDOMNode.replaceWith(newDOMNode);
        return;
    }
    if (
        typeof oldNode === "string" &&
        typeof newNode === "string"
    ) {
        if (oldNode !== newNode) {
            actualDOMNode.nodeValue = newNode;
        }

        return;
    }
    updateProps(
        actualDOMNode,
        oldNode.props,
        newNode.props
    );
    diffChildren(
        actualDOMNode,
        oldNode.children,
        newNode.children
    );
}


function diffChildren(actualDOMNode, oldChildren, newChildren) {
    const maxLength = Math.max(
        oldChildren.length,
        newChildren.length
    );
    for (let i = 0; i < maxLength; i++) {
        const oldChild = oldChildren[i];
        const newChild = newChildren[i];
        const actualDOMChild = actualDOMNode.childNodes[i];
        diff(
            oldChild,
            newChild,
            actualDOMChild
        );
    }
}


function updateProps(dom, oldProps, newProps) {
    for (const key in oldProps) {
        if (!(key in newProps)) {
            if (key === "style") {
                for (const styleName in oldProps.style) {
                    dom.style[styleName] = "";
                }
            } else {
                dom[key] = "";
            }
        }
    }
    for (const key in newProps) {
        if (key === "style") {
            const oldStyle = oldProps.style || {};
            const newStyle = newProps.style || {};
            for (const styleName in oldStyle) {
                if (!(styleName in newStyle)) {
                    dom.style[styleName] = "";
                }
            }
            for (const styleName in newStyle) {
                if (
                    oldStyle[styleName] !==
                    newStyle[styleName]
                ) {
                    dom.style[styleName] =
                        newStyle[styleName];
                }
            }
        } else {

            if (oldProps[key] !== newProps[key]) {
                dom[key] = newProps[key];
            }
        }
    }
}


function createDOMNode(node) {
    if (typeof node === 'string') {
        return document.createTextNode(node);
    }
    const dom = document.createElement(node.type);
    updateProps(
        dom,
        {},
        node.props
    );
    for (const child of node.children) {

        dom.appendChild(
            createDOMNode(child)
        );
    }
    return dom;
}
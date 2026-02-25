/// import * as Autodesk from "@types/forge-viewer";

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: ['Autodesk.DocumentBrowser']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            viewer.impl.renderer().setClearAlpha(0);
            viewer.impl.glrenderer().setClearColor(0xffffff, 0);
            viewer.impl.invalidate(true);
            viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, function () {
                viewer.toolbar.setVisible(false);
            });
            // Zugriff auf die Toolbar-Hauptinstanz
            // const toolbar = viewer.getToolbar();
            // const navControlGroup = toolbar.getControl(Autodesk.Viewing.TOOLBAR.NAVTOOLSID);

            // if (navControlGroup) {
            //     navControlGroup.setVisible(false); // Korrekte Methode zum Ausblenden
            // }
            // const logo = container.querySelector('.adsk-viewing-logo');
            // if (logo) logo.style.display = 'none';
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        viewer.setLightPreset(0);
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}

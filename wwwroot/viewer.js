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

function applyTransparency(viewer) {
    viewer.setEnvMapBackground(false);

    // THREE.js WebGL renderer: clear to fully transparent
    const glRenderer = viewer.impl.glrenderer();
    glRenderer.setClearColor(0x000000, 0);
    glRenderer.clear();

    // THREE.js scene background (r125+)
    if (viewer.impl.scene) viewer.impl.scene.background = null;

    // Autodesk renderer wrapper: disable background rendering
    const ctx = viewer.impl.renderer();
    if (ctx) {
        if (typeof ctx.renderBackground === 'function') ctx.renderBackground = () => {};
        if (typeof ctx.drawBackground === 'function') ctx.drawBackground = () => {};
    }

    viewer.impl.invalidate(true);
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = {
                extensions: ['Autodesk.DocumentBrowser'],
                canvasConfig: {
                    alpha: true,
                    premultipliedAlpha: false
                }
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            viewer.container.style.background = 'transparent';
            applyTransparency(viewer);
            viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function () {
                applyTransparency(viewer);
            });
            viewer.addEventListener(Autodesk.Viewing.TOOLBAR_CREATED_EVENT, function () {
                viewer.toolbar.setVisible(false);
            });

            const logo = container.querySelector('.adsk-viewing-logo');
            if (logo) logo.style.display = 'none';
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
        applyTransparency(viewer);
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}

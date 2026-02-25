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

function patchTransparency(viewer) {
    const ctx = viewer.impl.renderer();
    if (ctx._transparencyPatched) return;
    ctx._transparencyPatched = true;

    // Hook into beginScene (called every frame) to enforce alpha=0 before background is drawn
    const origBeginScene = ctx.beginScene.bind(ctx);
    ctx.beginScene = function (...args) {
        this.setClearAlpha(0);
        return origBeginScene(...args);
    };
}

function applyTransparency(viewer) {
    viewer.setEnvMapBackground(false);

    const ctx = viewer.impl.renderer();
    ctx.setClearAlpha(0);
    ctx.setBackgroundTexture(null);

    viewer.impl.glrenderer().setClearColor(0x000000, 0);
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
            patchTransparency(viewer);
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

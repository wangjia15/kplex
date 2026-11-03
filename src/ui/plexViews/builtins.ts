/** Static internal composition root. Test definitions are injected into independent test registries only. */
import {classicViewDefinition} from "../../core/plex/views/classic/definition";
import {mindMapViewDefinition} from "../../core/plex/views/mindmap/definition";
import {PlexViewRegistry} from "../../core/plex/views/registry";
import {wuXingViewDefinition} from "../../core/plex/views/wuxing/definition";
export const builtInPlexViews = new PlexViewRegistry([classicViewDefinition, mindMapViewDefinition, wuXingViewDefinition]);

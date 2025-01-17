// (C) 2021 GoodData Corporation
import { IDashboardBaseProps, IDashboardPluginContract_V1 } from "@gooddata/sdk-ui-dashboard";
import { IClientWorkspaceIdentifiers } from "@gooddata/sdk-ui";
import { IEmbeddedPlugin } from "./loader";
import { ObjRef } from "@gooddata/sdk-model";

/**
 * This a specialization of {@link @gooddata/sdk-ui-dashboard#IDashboardBaseProps} interface in which the `dashboard` can only be provided
 * by reference.
 *
 * @public
 */
export interface IDashboardBasePropsForLoader extends Omit<IDashboardBaseProps, "dashboard"> {
    /**
     * Specify reference to an existing dashboard that should be loaded. You may specify an `idRef` or `uriRef`; as
     * a convenience you may also specify dashboard object identifier (string) - that's same as using `idRef(objectIdentifier)`.
     */
    dashboard: string | ObjRef;
}

/**
 * Dashboard loading options.
 *
 * @public
 */
export interface IDashboardLoadOptions extends IDashboardBasePropsForLoader {
    /**
     * Loading mode to use.
     *
     * `staticOnly` mode
     *
     * The loader expects that it is running inside an application that depends on the `@gooddata/sdk-ui-dashboard`
     * package. Furthermore the loader will initialize dashboard with only those plugins that are part of
     * the application and passed via `extraPlugins` property. Plugins that are linked with the dashboard
     * will be ignored.
     *
     * This mode is suitable during plugin development
     *
     * `adaptive` mode
     *
     * In this mode, loader will first inspect the dashboard and then act based on the dashboard setup:
     *
     * -  If the dashboard stored on the analytical backend is configured to use some plugins, the loader will dynamically
     *    load the dashboard engine required by those plugins and then dynamically load the plugins.
     *    It will then initialize the dashboard engine with the loaded plugins and any plugins that are
     *    passed via the `extraPlugins` property.
     *
     * -  If the dashboard is not configured to use any plugins, the loader will fall back to `staticOnly`
     *    behavior.
     *
     * Default loadingMode is `adaptive`.
     */
    loadingMode?: "adaptive" | "staticOnly";

    /**
     * Optionally specify client workspace identifiers to use in order to identify exact workspace to load
     * the dashboard from. Client workspace identifiers are not applicable to all backends - only the 'bear'
     * backend supports them. They are tightly related to the Lifecycle Management feature of the 'bear'
     * backend.
     *
     * If you specify the client workspace then it has preference over all other means that can be used
     * to specify the workspace; more specifically the `workspace` prop on this object and workspace that may
     * be defined by the context will be ignored.
     */
    clientWorkspace?: IClientWorkspaceIdentifiers;

    /**
     * Optionally specify extra plugins to use during the bootstrap of the dashboard. Code for these extra
     * plugins must be available at compile time.
     */
    extraPlugins?: IEmbeddedPlugin | IEmbeddedPlugin[];

    /**
     * Specify configuration related adaptive loading.
     * If loadingMode is not set to "staticOnly", this is mandatory.
     */
    adaptiveLoadOptions?: AdaptiveLoadOptions;
}

/**
 * Adaptive loading requires additional options passed by the client. The crucial options are the
 * module federation integration functions.
 *
 * The adaptive loader relies on Webpack's Module Federation to get the job done and expects that it
 * is running in context where Webpack Module Federation is correctly setup; the load requires few functions
 * from webpack in order to work properly. You need to pass them in via these options.
 *
 * @public
 */
export type AdaptiveLoadOptions = {
    /**
     * The Module Federation interoperability functions.
     *
     * @remarks
     * For information on how to get the value of this, see {@link ModuleFederationIntegration}).
     */
    moduleFederationIntegration: ModuleFederationIntegration;
};

/**
 * Module federation interop data.
 *
 * @remarks
 * All of the values are added by webpack to the global scope if the Module Federation plugin is used in your app.
 * See the following example of a webpack config for this to work:
 * @example
 * ```
 * const { ModuleFederationPlugin } = require("webpack").container;
 *
 * // add all the gooddata packages that absolutely need to be shared and singletons because of contexts
 * const gooddataSharePackagesEntries = Object.keys(deps)
 *   .filter((pkg) => pkg.startsWith("@gooddata"))
 *   .reduce((acc, curr) => {
 *     acc[curr] = { singleton: true };
 *     return acc;
 *   }, {});
 *
 * module.exports = {
 *   // rest of your webpack config
 *   plugins: [
 *     // rest of your plugins
 *     new ModuleFederationPlugin({
 *       shared: {
 *         react: {
 *             import: "react",
 *             shareKey: "react",
 *             singleton: true,
 *         },
 *         "react-dom": {
 *             singleton: true,
 *         },
 *         // add all the packages that absolutely need to be shared and singletons because of contexts
 *         "react-intl": {
 *             singleton: true,
 *         },
 *         ...gooddataSharePackagesEntries,
 *       },
 *     }),
 *   ]
 * };
 * ```
 *
 * @public
 */
export type ModuleFederationIntegration = {
    __webpack_init_sharing__: (scope: string) => Promise<void>;
    __webpack_share_scopes__: any;
};

/**
 * Dashboard plugin and its parameters.
 * @public
 */
export type LoadedPlugin = {
    plugin: IDashboardPluginContract_V1;
    parameters: string | undefined;
};

import RootHydrateFallback from "~/views/HydrateFallback";
import RootErrorBoundary from "~/views/RootErrorBoundary";
import Dashboard from "~/views/Dashboard";
export default [{
    path: "/",
    ErrorBoundary: RootErrorBoundary,
    HydrateFallback: RootHydrateFallback,
    Component: Dashboard,
    children: [
        /* {
            index: true, lazy: async () => {
                const home = await import("~/views/Home");
                return { Component: home.default, loader: home.homeLoader }
            }
        },
        {
            path: "faq", lazy: async () => {
                const faq = await import("~/views/Faq");
                return { Component: faq.default, }
            }
        },
        {
            path: "admin", lazy: async () => {
                const admin = await import("~/views/Admin");
                return { Component: admin.default, loader: admin.adminLoader };
            }
        },
        {
            path: "pay", lazy: async () => {
                const pay = (await import("~/views/Payment"));
                return { Component: pay, loader: pay.paymentLoader };
            }
        } */
        { index: true, lazy: { Component: async () => (await import("~/views/Home")).default, loader: async () => (await import("~/views/Home")).homeLoader } },
        { path: "faq", lazy: { Component: async () => (await import("~/views/Faq")).default } },
        { path: "admin", lazy: { Component: async () => (await import("~/views/Admin")).default, loader: async () => (await import("~/views/Admin")).adminLoader } },
        { path: "pay", lazy: { Component: async () => (await import("~/views/Payment")).default, loader: async () => (await import("~/views/Payment")).paymentLoader } }
    ]
},
{
    // SSR is disabled for this endpoint
    path: "/edit",
    lazy: { Component: async () => (await import("~/views/DesignEditor/PhotoboothEditor")).default, loader: async () => ((await import("~/views/DesignEditor")).loader) },
    ErrorBoundary: RootErrorBoundary,


}
]
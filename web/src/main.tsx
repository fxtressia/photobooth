import ReactDOM, { hydrateRoot } from "react-dom/client"
import Provider from "./Provider"

import { RouterProvider, createBrowserRouter, matchRoutes } from "react-router"
//import Container from "./Container"
import "./styles/styles.css"
import routes from "./routes"

(async () => {

  const lazyRoutes = matchRoutes(routes, window.location)?.filter((route) => "lazy" in route.route);

  if (lazyRoutes && lazyRoutes.length > 0) {
    const promises = [];
    for (const route of lazyRoutes) {

      promises.push((async () => {
        //console.log("working")
        // @ts-expect-error
        const component: React.Element = await route.route.lazy.Component();
        route.route.Component = component;

      })());

      promises.push((async () => {
        // @ts-expect-error
        if ("loader" in route.route.lazy) {
          // @ts-expect-error
          const component: React.Element = await route.route.lazy.loader();

          route.route.loader = component;
        }
      })());

      route.route.lazy = undefined
    }
      await Promise.all(promises);
    
    /*await Promise.all(lazyRoutes.map(async (route) => {
      
      const lazyRoute = await route.route.lazy!();

      Object.assign(route.route, {...lazyRoute, lazy: undefined});
    }));*/
  }
 
  const router = createBrowserRouter(routes, {
    // @ts-expect-error As per Hono docs, hydration data is embedded onto window.__staticRouterHydrationData.
    hydrationData: window.__staticRouterHydrationData,
  });
  hydrateRoot(
    document.getElementById("root")!,

    <Provider>
      {/* <Container>*/}
      <RouterProvider router={router} />
      {/* </Container> */}
    </Provider>

  )

})()
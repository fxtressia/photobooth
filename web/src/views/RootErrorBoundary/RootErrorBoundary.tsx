import { isRouteErrorResponse, useRouteError } from "react-router";

export default function RootErrorBoundary() {
  const error = useRouteError();
  return <div style={{ backgroundColor: "#6e6eff", fontFamily: "monospace", fontSize: "1rem", height: "100vh", color: "white" }}>
    <div style={{ padding: "50px", }}>
    {(() => {

      if (isRouteErrorResponse(error)) {
        return (
          <>
            <h1>
              {error.status} {error.statusText}
            </h1>
            <p>{error.data}</p>
          </>
        );
      } else if (error instanceof Error) {
        return (
          <div>
            <h1>Error</h1>
            <p>{error.message}</p>
            <p>The stack trace is:</p>
            <pre>{error.stack}</pre>
          </div>
        );
      } else {
        return <h1>Unknown Error</h1>;
      }
      })()}</div>
  </div>;
}
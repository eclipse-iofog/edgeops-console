import React, { useEffect, useState } from "react";
import SwaggerUI from "swagger-ui-react";
import YAML from "js-yaml";

const SwaggerDoc = () => {
  const [swaggerDocument, setSwaggerDocument] = useState(null);

  useEffect(() => {
    const fetchSwaggerDoc = async () => {
      try {
        const response = await fetch("/swagger.yaml");
        const yamlText = await response.text();
        const document = YAML.load(yamlText);
        if (!document.components) document.components = {};
        if (!document.components.securitySchemes)
          document.components.securitySchemes = {};
        document.components.securitySchemes.authToken = {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        };
        const href = window.location.href;
        const hashIndex = href.indexOf("#");
        const queryString =
          hashIndex !== -1 ? href.substring(hashIndex + 2) : "";
        const queryParams = new URLSearchParams(queryString.split("?")[1]);
        const authToken = queryParams.get("authToken") || "";
        const baseUrl =
          queryParams.get("baseUrl") || "http://localhost:51121/api/v3";
        document.servers = [
          {
            url: baseUrl,
          },
        ];
        document.security = authToken
          ? [
              {
                authToken: [],
              },
            ]
          : [];

        setSwaggerDocument(document);

        if (authToken) {
          window.ui?.authActions?.authorize({
            authToken: {
              name: "authToken",
              schema: {
                type: "http",
                in: "header",
                name: "Authorization",
                description: "Bearer Token",
              },
              value: `Bearer ${authToken}`,
            },
          });
        }
      } catch (error) {
        console.error("Swagger YAML Failed:", error);
      }
    };

    fetchSwaggerDoc();
  }, []);

  if (!swaggerDocument) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-h-[82vh] min-h-[82vh]">
      <div id="swagger-container" className="bg-white">
        <SwaggerUI
          spec={swaggerDocument}
          persistAuthorization={true}
          requestInterceptor={(request) => {
            const href = window.location.href;
            const hashIndex = href.indexOf("#");
            const queryString =
              hashIndex !== -1 ? href.substring(hashIndex + 1) : "";
            const queryParams = new URLSearchParams(queryString.split("?")[1]);
            const authToken = queryParams.get("authToken") || "";
            if (authToken) {
              request.headers["Authorization"] = `Bearer ${authToken}`;
            }
            return request;
          }}
          onComplete={(system) => {
            const href = window.location.href;
            const hashIndex = href.indexOf("#");
            const queryString =
              hashIndex !== -1 ? href.substring(hashIndex + 1) : "";
            const queryParams = new URLSearchParams(queryString.split("?")[1]);
            const authToken = queryParams.get("authToken") || "";
            if (authToken) {
              system.authActions.authorize({
                authToken: {
                  name: "authToken",
                  schema: {
                    type: "http",
                    in: "header",
                    name: "Authorization",
                    description: "Bearer Token",
                  },
                  value: `Bearer ${authToken}`,
                },
              });
            }
          }}
        />
      </div>
    </div>
  );
};

export default SwaggerDoc;

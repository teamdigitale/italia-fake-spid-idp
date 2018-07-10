import { create, withDefaults } from "./idp";

const app = create(
  withDefaults({
    users: [
      {
        id: "test1",
        attributes: {
          pisa_id: {
            format: "urn:oasis:names:tc:SAML:2.0:attrname-format:uri",
            value: "test1",
            type: "xs:string"
          }
        }
      }
    ]
  })
);

app.listen(8000);

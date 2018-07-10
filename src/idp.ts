import * as express from "express";
import { address } from "ip";
import bodyParser = require("body-parser");
import { parseRequest, createResponse } from "./response";
import { createId } from "./util";

export type UserAttribute = {
  format: string;
  value: string;
  type: string;
};

export type User = {
  id: string;
  attributes: { [k: string]: UserAttribute };
};

export type Options = {
  entity?: string;
  host?: string;
  port?: number;
  users: User[];
  spNameQualifier?: string;
  nameQualifier?: string;
  address?: string;
  id?: string;
};

export function withDefaults(options: Options) {
  options.address = options.address || address();

  options.host = options.host || "http://localhost";

  if (options.host || options.port) {
    options.host = options.host || `http://localhost:${options.port}`;
    options.entity = options.entity || `${options.host}/idp`;
    options.nameQualifier = options.nameQualifier || options.entity;
    options.id = options.id || createId(options.entity);
  }
  return options;
}

function validateUser(
  req: express.Request,
  options: Options
): User | undefined {
  const userId = req.query.userid;
  if (userId) {
    return options.users.find(u => u.id === userId);
  }
  return undefined;
}

export function create(options: Options) {
  const app = express();

  app.set("views", `${__dirname}/views`);
  app.set("view engine", "ejs");

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // Log in page / details
  app.get("/", (_, res) => {
    res.status(200).send("Nothing to see here");
  });

  // SSO using HTTP-REDIRECT
  app.get("/login", (req, res) => {
    const user = validateUser(req, options);
    console.log(user);
    if (user) {
      parseRequest(req)
        .then(request => {
          console.log(request);
          const response = createResponse(
            options,
            req,
            user,
            request.destination
          );
          res.render("postResponse", response);
        })
        .catch(e => res.status(500).send(`Error: ${e}`));
    } else {
      res.status(500).send("USER NOT FOUND");
    }
  });

  return app;
}

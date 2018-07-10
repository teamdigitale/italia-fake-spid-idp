import * as moment from "moment";
import * as express from "express";

import { inflateRaw } from "zlib";
import { readFileSync } from "fs";
import { template } from "lodash";
import { SignedXml } from "xml-crypto";
import { toJson } from "xml2json";

import { createId } from "./util";
import { User, Options } from "./idp";

const xmlTemplate = template(
  readFileSync(`${__dirname}/templates/auth-answer.xml`, { encoding: "utf8" })
);

const privateKey = readFileSync(`${__dirname}/../certs/key.pem`, {
  encoding: "utf8"
});

function sign(xml: string) {
  const sig = new SignedXml();
  const assertion = `/*[local-name()='Response']/*[local-name()='Assertion']`;
  const issuer = `${assertion}/*[local-name()='Issuer']`;
  sig.addReference(
    assertion,
    [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#"
    ],
    "http://www.w3.org/2000/09/xmldsig#sha1"
  );
  sig.signingKey = privateKey;
  sig.computeSignature(xml, {
    prefix: "ds",
    location: { reference: issuer, action: "after" }
  });
  return sig.getSignedXml();
}

export type ParsedRequest = {
  destination: string;
  inResponseTo: string;
};

export async function parseRequest(
  request: express.Request
): Promise<ParsedRequest> {
  const buf = Buffer.from(request.query.SAMLRequest, "base64");
  const rawBuffer = await new Promise<Buffer>((resolve, reject) => {
    inflateRaw(buf, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
  const xml = rawBuffer.toString("utf8");
  const req = toJson(xml, { object: true });
  console.log(`req: ${JSON.stringify(req)}`);
  const rootXmlKey = Object.keys(req)[0];
  console.log(`root xml key: ${rootXmlKey}`);
  const rootNode = (req as any)[rootXmlKey];
  console.log(`root node: ${rootNode}`);
  return {
    destination: rootNode.AssertionConsumerServiceURL,
    inResponseTo: rootNode.ID
  };
}

export function createResponse(
  options: Options,
  request: express.Request,
  user: User,
  destination: string
) {
  const responseProperties = {
    authnInstant: moment().toISOString(),
    issueInstant: moment().toISOString(),
    notBefore: moment().toISOString(),
    notOnOrAfter: moment()
      .add(30, "m") // duration of assertion
      .toISOString()
  };
  const dataWithoutAssertionId = {
    ...options,
    ...request,
    ...responseProperties,
    user
  };
  const data = {
    ...dataWithoutAssertionId,
    assertionId: createId(JSON.stringify(dataWithoutAssertionId))
  };
  const xml = xmlTemplate(data);
  const signedXml = sign(xml);
  const buf = Buffer.from(signedXml, "utf8");

  return {
    ...data,
    action: destination,
    response: buf.toString("base64")
  };
}

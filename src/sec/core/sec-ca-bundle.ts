import { Logger } from '@nestjs/common';
import { X509Certificate } from 'crypto';

const PEM_CERTIFICATE =
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g;

export const parseCaBundle = (
  bundlePem: string | undefined,
  logger: Logger,
): X509Certificate[] =>
  (bundlePem?.match(PEM_CERTIFICATE) ?? [])
    .map((pem) => {
      try {
        return new X509Certificate(pem);
      } catch (error) {
        logger.error({
          message: 'Ignoring unparseable certificate in SEC_VAMSS_CA_BUNDLE',
          error: (error as Error).message,
        });
        return null;
      }
    })
    .filter((cert): cert is X509Certificate => cert !== null);

export const isIssuedBySecCa = (
  leaf: X509Certificate,
  caCertificates: X509Certificate[],
) =>
  caCertificates.some(
    (ca) => leaf.checkIssued(ca) && leaf.verify(ca.publicKey),
  );

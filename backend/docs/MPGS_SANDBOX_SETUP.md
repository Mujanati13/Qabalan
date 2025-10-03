# MPGS Sandbox Setup

This backend ships with Mastercard Payment Gateway Services (MPGS) sandbox credentials so the FECS stack can be exercised end-to-end without manual configuration. Use this guide to understand what is bundled, how to override it, and where to find the official integration documentation.

## Current Sandbox Credentials

| Setting | Value |
| --- | --- |
| Gateway base | `https://test-network.mtf.gateway.mastercard.com`
| API version | `73`
| Merchant ID | `TESTNITEST2`
| API username | `merchant.TESTNITEST2`
| API password | `ac63181fe688fe7ce3cf5a1f105a145a`

These credentials are enabled as the default fallback inside `services/mpgsService.js` and `routes/payments.js`. They come from Mastercard's public **TESTNITEST2** sandbox tenant and are safe for non-production use only.

> ⚠️ **Security reminder**
>
> - Never ship production or customer data through the sandbox gateway.
> - Always override `MPGS_API_PASSWORD` with live credentials in staging/production deployments.
> - Store live values in environment variables or your platform's secret store instead of committing them to source control.

## Environment Variables

Define any of the following variables in `.env` to override the bundled defaults:

```bash
MPGS_GATEWAY=https://your-gateway.mastercard.com
MPGS_API_VERSION=73
MPGS_MERCHANT_ID=YOUR_MERCHANT_ID
MPGS_API_USERNAME=merchant.YOUR_MERCHANT_ID
MPGS_API_PASSWORD=your-secret
MPGS_DEFAULT_CURRENCY=JOD
MPGS_MERCHANT_DISPLAY_NAME=Your Merchant Display Name
MPGS_RETURN_BASE_URL=https://your-frontend.com
```

If an environment variable is missing, the sandbox values above are used automatically. `.env.example` includes the same defaults so you can copy it into `.env` and update only the password if you prefer.

## Helpful Endpoints

- `POST /api/payments/mpgs/checkout-session` – Hosted checkout session creator for frontend clients.
- `GET /api/payments/mpgs/payment/view` – PHP-style hosted checkout page.
- `GET /api/payments/mpgs/return` – Validate MPGS redirects.
- `GET /api/payments/mpgs/debug-order/:orderId` – Inspect the latest MPGS status for a specific order.

See `MPGS_ROUTES_SUMMARY.md` for a full list.

## Official Integration Guides

The following Mastercard documentation links are relevant for sandbox testing and 3DS flows:

- [Integration & Test Cards](https://test-gateway.mastercard.com/api/documentation/integrationGuidelines)
- [3DS 2.0 API Integration Model](https://test-gateway.mastercard.com/api/documentation/integrationGuidelines/supportedFeatures/pickAdditionalFunctionality/authentication/3DS/integrationModelAPI.html?locale=en_US#x_3DSTest)
- [Test and Go-Live Checklist](https://test-gateway.mastercard.com/api/documentation/integrationGuidelines/supportedFeatures/testAndGoLive.html?locale=en_US)

Use those documents when implementing advanced payment flows (3DS authentication, capture/refund, etc.).

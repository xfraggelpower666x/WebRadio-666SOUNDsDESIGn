# RELEASE VERIFICATION v1.2.7

Status: PASS

## Release
`FULLVERSION_AMARIS_BRANDING_BACKGROUND_ICONS_MEDIASESSION_v1.2.7`

## Local Verification
- `npm run verify`: PASS
- Node tests: 41 / 41 PASS
- JavaScript/MJS syntax: 111 PASS
- Public mirror pairs: 56 PASS
- Nested ZIP files: 0

## Branding Checks
- Original image 1 exists locally as AMARIS desktop background asset.
- Original image 2 exists locally as AMARIS fallback/stream cover asset.
- Icon set generated from image 2.
- `/amaris.webmanifest` created and linked from AMARIS.
- `site.webmanifest` updated with new icon set.
- Media Session metadata/artwork logic added to AMARIS.

## Live checks still required
- Real PC browser background rendering after Cloudflare upload.
- iPhone Add-to-Home icon cache behavior.
- iPhone Lock Screen / Control Center Media Session artwork.
- Android PWA icon and media notification.

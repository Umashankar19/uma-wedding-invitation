Priti & Uma Wedding Invitation — V3

What is included:
- Event cards have one explicit “View Location” button each.
- Each event opens its own location bottom-sheet/modal.
- Venue/address/map values are placeholders and can be filled later.
- Richer handwritten Maithili invitation.
- Mithila-inspired floral/geometric ornamentation.
- Page entrance transitions.
- Photo gallery lightbox with next/previous and touch swipe.
- RSVP and wishes are saved with browser localStorage for prototype/testing. For real guest-wide storage, connect a backend such as Supabase/Firebase later.
- WhatsApp share button + OpenGraph metadata for the future hosted link.
- Games section remains removed.
- Pictures and final locations can be added last.

To run: open index.html through VS Code Live Server.


UPDATED BUILD
-------------
This build uses:
- assets/couple-faceless.jpg for the first-page couple illustration.
- assets/mithila-border.png for the consistent Mithila frame on every page.

To replace the couple illustration later, overwrite:
  assets/couple-faceless.jpg

The real photographs and venue information can be added later without changing the overall UI structure.


V5 PAGE ART WORKFLOW
--------------------
The page borders are now separated from HTML content.

Each page has its own design bucket:
assets/page-designs/01-welcome/
assets/page-designs/02-invitation/
assets/page-designs/03-beginning/
assets/page-designs/04-moments/
assets/page-designs/05-families/
assets/page-designs/06-events/
assets/page-designs/07-location/
assets/page-designs/08-countdown/
assets/page-designs/09-blessings/
assets/page-designs/10-rsvp/
assets/page-designs/11-finale/

Put the finished page artwork in the matching folder as:
    design.png

The artwork should include the complete Mithila/ornamental border and
page background. The HTML/CSS then places the live content on top.

This intentionally avoids nested CSS borders and is the new preferred
architecture for the project.

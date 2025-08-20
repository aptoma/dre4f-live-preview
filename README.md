DrEdition Front Pages Live Preview
==================================

This is an example repo with a preview that connects to the live preview server and renders a live preview of the data
for the edition. You can use this as a basis for creating a more sophisticated live preview.

Setup
============

Copy config.example.js to config.js, an optionally define an API key and user id. These can also be provided in the
preview url configured in DrEdition.

Run `npm install` and `npm start`.

In DrEdition, you need to check the “Enable live preview data sync for editions” in the product settings.
This is needed to make DrEdition sync data with the live preview server.

Configure the product in DrEdition with a preview url like this.

    http://localhost:7002/{?editionId,userId}


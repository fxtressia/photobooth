# A Photobooth Project

Before the event, staff will have to configure the system's
- list of events they plan to attend within the duration of the system's operation or list of venues where individual machines will run.
- access pass tiers they choose to offer which can have varying quota or limits based on their prices
- plugins and source code, if they choose to

Before or on the day of the event, the user will have to purchase an access pass:
- through the web dashboard by:
    - accessing the service's website, 
    - logging into Auth0
    - checking out the tier they'd like to purchase
    - paying for their access pass
        - automatic 
        - manual verification
- 


On the D-Day of the event, the UX flow is as follows:
- The user pays for the service. Digital payment integration is not implemented in this project, so a staff will have to press "Generate Session" button in the Admin UI, generating a session ID, a unique URL, and a QR Code for the user to access. The session row in the D1's database will have its owner set to null. 
- The user accesses the URL or scans the QR Code (which will also do the former) and logs into Auth0, automatically claiming the session ID as theirs once Auth0 redirected them to our callback URL.
- The user logs into the machine by scanning the QR code presened on the screen. A staff can also remotely log the user into the machine so long as they have logged into Auth0 and claimed their session ID, making the user not have to scan yet another QR code.  
- The user presses a "Start" button, which starts the timer and allows them to access the machine.
    - A "log out" button will appear in this state, allowing other users to log in if the current one runs away from the booth for an emergency.
- The user accesses the machine for a set period of time, which by default is 10 minutes, excluding the time it takes for the system to wait for the camera's shutter to complete. Inside the machine, they can open two apps.
    - The camera app, which will take pictures using gphoto2, upload the web-compressed version of them to Cloudinary, and tell the backend to increase the picture count of the session.
    - The pictures-editing app, which has a user interface similar to Canva, where they they will be able to pick templates, drag and drop all pictures from the current and previous sessions into the frames along with available stickers, and order prints of their photobooth pictures.
        - When they access this app, by default, a design using standard aspect ratio (4:6) will be automatically created. They could also press a "choose an existing design" to edit or duplicate a previous design.
- After leaving the machine, they can log again into the pictures-editing app to continue their progress. Ordering prints will remain available so long as the're an active machine at the moment. Users will have to physically pick the picture the moment they're printed though, so they're have to be present nearby.


Staff will be able to edit the list of events, packages

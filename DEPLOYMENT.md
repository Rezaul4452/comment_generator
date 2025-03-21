# Deployment Guide for Hostinger Shared Hosting

## Pre-deployment Steps

1. **Prepare Files**
   - Ensure all files are in the root directory
   - Verify all file paths are relative
   - Check all files have proper permissions (644 for files, 755 for directories)

2. **Update Firebase Configuration**
   - Verify Firebase configuration in `app.js` is correct
   - Enable necessary Firebase services in the Firebase Console
   - Add your Hostinger domain to authorized domains in Firebase Console

3. **Update Meta Tags**
   - Update the site URL in `robots.txt`
   - Verify meta tags in `index.html` are correct
   - Update manifest.json with correct paths

## Deployment Steps

1. **Login to Hostinger Control Panel**
   - Access File Manager or FTP credentials

2. **Upload Files**
   - Upload all project files to the public_html directory
   - Maintain the following structure:
     ```
     public_html/
     ├── app.js
     ├── index.html
     ├── styles.css
     ├── manifest.json
     ├── robots.txt
     └── .htaccess
     ```

3. **Configure Domain**
   - Point your domain to Hostinger nameservers
   - Set up SSL certificate through Hostinger

4. **Post-deployment Checks**
   - Verify HTTPS is working
   - Test Firebase connectivity
   - Check if comments are being saved and retrieved
   - Verify all UI elements are functioning
   - Test on different browsers and devices

## Troubleshooting

1. **If Firebase Connection Fails**
   - Verify domain is added to Firebase authorized domains
   - Check browser console for CORS errors
   - Ensure Firebase configuration is correct

2. **If Pages Don't Load**
   - Check .htaccess configuration
   - Verify file permissions
   - Clear browser cache and CDN cache

3. **Performance Issues**
   - Enable Hostinger's LiteSpeed Cache
   - Verify all static assets are being cached
   - Check network tab for slow requests

## Maintenance

1. **Regular Checks**
   - Monitor Firebase usage and quotas
   - Check error logs regularly
   - Keep dependencies updated

2. **Backup**
   - Regular backup of Firebase data
   - Keep local copy of all files
   - Document any configuration changes
# Merge Tag Demo

This is a demo file to test the Smart Clipboard merge tag feature.

## Test Steps:

1. Copy this text: "Smart Clipboard Manager"
2. Open Smart Clipboard (Cmd+Shift+V)
3. Pin the item with merge tag "app_name"
4. Copy this text: "hello@smartclipboard.com"  
5. Pin it with merge tag "support_email"
6. Copy this text: "123 Innovation Street, San Francisco, CA 94107"
7. Pin it with merge tag "company_address"

## Now test the replacement:

Type these merge tags in any text editor and select them, then press Ctrl+Option+M:

- app_name
- support_email  
- company_address

Each selected tag should be replaced with the corresponding saved text!

## Sample usage in a document:

Dear Customer,

Thank you for using app_name! If you need support, please contact us at support_email.

You can also visit our offices at:
company_address

Best regards,
The app_name Team

---

After selecting each merge tag and pressing Ctrl+Option+M, this should become:

Dear Customer,

Thank you for using Smart Clipboard Manager! If you need support, please contact us at hello@smartclipboard.com.

You can also visit our offices at:
123 Innovation Street, San Francisco, CA 94107

Best regards,
The Smart Clipboard Manager Team

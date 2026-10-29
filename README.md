# Daboys

A mobile-first, dark-themed hangout payment tracker built with **HTML, CSS, and vanilla JavaScript**. Currency: **Saudi riyals (SAR)**.

## Put it on GitHub Pages

Upload these three files to the root of your GitHub repository:

- `index.html`
- `styles.css`
- `app.js`

If GitHub Pages is not already enabled, go to your repository **Settings → Pages**, select **Deploy from a branch**, choose your branch and **/(root)**, and save. No build tools, dependencies, database, or secrets are needed.

You can also open `index.html` locally in a browser.

## How it works

1. Open **Members & Settings** and add permanent members by name, or use the quick-add field while creating a hangout.
2. Create a **New hangout**, enter the total bill, select saved members, and/or add temporary members. Temporary members exist only within that hangout (but their names remain in unresolved debt records if they are later removed).
3. Each person's share is calculated in **halalas** (1 SAR = 100 halalas). Any remainder is distributed one halala at a time so the shares add up to the exact bill.
4. Record what each person paid and their method (**Cash**, **PoS**, or **Direct Transfer**). Entering a payment amount **does not mark the person done**; the checkbox is the only way. Checking the box automatically fills any unpaid share, but preserves overpayments. Unchecking leaves the amount as-is.
5. If someone pays more than their share, Daboys creates an **automatic debt owed to that person**, initially assigned to the **group/shared pool**. Edit the debt to assign a specific debtor or change the amount. You can also create independent manual debts. Settle debts with the quick buttons or a custom amount.
6. On any existing hangout, choose **Add member** to select a saved member or add a new permanent or temporary member. To remove a participant, use **Remove** in their payment card. Both changes show a confirmation preview. The bill is re-split to the halala, but recorded payments and payment methods are not changed. Completed members become unfinished if their new share exceeds what they paid. Adding people may create/increase automatic refund debts for members who paid above their new shares.
7. Removing a member refunds **their entire recorded payment** through a debt owed to them, while keeping any refunds already recorded. A removed temporary member stays identifiable in debts, including manual debts they owe, until all debts are settled. The hangout must keep at least one active member.
8. Once **every member is checked done** and **every debt is fully settled**, use **Complete hangout**. Confirming permanently removes the hangout, its payments, debts, and temporary members. Permanent members remain.

### Debt details

- Automatic debts are based on the overpayment amount, not an automatic redistribution of other members' shares.
- Editing an automatic debt changes its **manual adjustment** relative to the calculated refund. Later share changes still increase or decrease the debt by the same difference. Refunds already recorded as settled are never erased; if they exceed the recalculated entitlement, the debt is shown as fully settled with an over-refund note.
- Deleting an automatic debt dismisses it while the person remains in the hangout. A new overpayment can create another debt after their payment returns to their share or below. Removing a paid member always creates a refund debt, even if an earlier overpayment debt was dismissed.
- Settlements are entered manually. The app does **not** move money or connect to a bank.
- Completing a hangout is irreversible; there is no archive.

## Delete all data

Open **Members & Settings → Danger zone → Delete all data**. There are two separate confirmation dialogs. The final one requires typing **`DELETE DABOYS`** exactly before the permanent deletion button becomes available. This removes every Daboys member, hangout, payment, and debt saved under this site in the current browser. **There is no undo.** It does not affect other websites or other devices.

## Data & backups

**All app data is saved in your browser's `localStorage` on your device, not on GitHub or a remote server.** It persists across normal page reloads on the same browser and site origin, but **does not sync** between browsers or devices. Private/incognito browsing and clearing site data can remove it.

**Members & Settings → Export JSON** downloads **only permanent member names**. **Import JSON** merges names (case-insensitive), skipping duplicates; it does not import hangouts or debts. Accepted formats:

```json
{"members":[{"name":"Ahmed"},{"name":"محمد"}]}
```

or a simple array:

```json
["Ahmed", "محمد"]
```

> **Important:** This member export is not a backup of active hangouts, payments, or debts. Keep your browser data intact while any hangouts are active.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and navigation |
| `styles.css` | Mobile-first responsive dark theme |
| `app.js` | Payment splitting, members, debts, storage, and interactions |

No third-party scripts, fonts, frameworks, or tracking services are used.

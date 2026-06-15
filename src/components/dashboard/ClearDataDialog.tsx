import { useState } from "react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "./../ui/alert-dialog";
import { Button } from "./../ui/button";
import { Trash2 } from "lucide-react";

export function ClearDataDialog({
  handleClearAllData,
}: {
  handleClearAllData: () => void;
}) {
  const [confirmationText, setConfirmationText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const requiredPhrase = "DELETE ALL DATA";

  const isConfirmed = confirmationText === requiredPhrase && acknowledged;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="items-center">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear All Data
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            This action is irreversible and cannot be undone
          </AlertDialogTitle>
          <AlertDialogDescription>
            All user data will be permanently deleted. Please type{" "}
            <strong>{requiredPhrase}</strong> to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 flex flex-col gap-3">
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            onPaste={(e) => e.preventDefault()}
            placeholder={`Type "${requiredPhrase}"`}
            className="w-full border rounded px-3 py-2"
          />

          <label className="flex items-start space-x-2 mx-2">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="w-5 h-5"
            />
            <span>
              I fully understand that this will permanently delete all my data,
              including uploaded notes, and profile data and it cannot be
              restored. The requests data will not be deleted and will remain
              accessible.
            </span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogTrigger
            onClick={handleClearAllData}
            disabled={!isConfirmed}
            className={`h-10 px-4 py-2 rounded-lg ${
              isConfirmed
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted hover:bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            Confirm Delete
          </AlertDialogTrigger>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import React from 'react';
import { Alert } from '../ui/UI';

export default function NoPatientRecord() {
  return (
    <Alert type="warn" title="Your account is not linked to a patient record">
      Reports and doctor reviews are stored on a patient record, but none was found for your account. Please contact
      the hospital administrator so your patient record can be created.
    </Alert>
  );
}

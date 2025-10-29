import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from '@mui/material';

export default function DeletionReasonDialog({ open, title = 'Confirmar Exclusão', helperText = 'Explique o motivo (mínimo 10 caracteres).', onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setError('');
    }
  }, [open]);

  const handleConfirm = () => {
    const r = (reason || '').trim();
    if (r.length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }
    onConfirm && onConfirm(r);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>{helperText}</Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
          error={Boolean(error)}
          helperText={error || ' '} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={handleConfirm}>Excluir</Button>
      </DialogActions>
    </Dialog>
  );
}



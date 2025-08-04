// Transaction utility helpers

export function isTransferTransaction(transaction) {
  const transferKeywords = ['transfer', 'move', 'send', 'receive', 'wire', 'ach'];
  const details = transaction.details?.toLowerCase() || '';
  const category = transaction.category?.toLowerCase() || '';
  // Handle Plaid-style transfer categories (uppercase with underscores)
  const isPlaidTransfer = transaction.category?.includes('TRANSFER') || 
                         transaction.category?.includes('TRANSFER_IN') ||
                         transaction.category?.includes('TRANSFER_OUT');
  return category === 'transfers' || 
         category === 'transfer' ||
         isPlaidTransfer ||
         transferKeywords.some(keyword => details.includes(keyword)) ||
         transaction.transaction_type === 'Transfer';
} 
# Assignment 4 - Write your stake program

## Requirements
Enhance the stake program from the code in `/week-4/code` with the following improvements:

- Calculate rewards based on the staked amount: 1% of the stake amount per block.
- Enable support for multiple reward vaults to accommodate different tokens.
- Implement validation to ensure the staker and mint match when a user unstakes (refer to the has_one constraint).
- When a user unstakes, close the associated stake_info account instead of updating it.
Return the rent-exempt lamports from the closed account back to the staker.
- Bonus (Optional): Allow users to unstake a portion of their staked amount.
If the stake amount becomes zero after a partial unstake, close the stake_info account.

## Submission

- Begin your work using the code found in the `/week-4/code` folder.
- Ensure all the assignment code resides in the `/week-4/assignment` directory. The final submission deadline is `29/08/2024`.
  Once completed, open a GitHub issue in your forked repository titled `Submission for Assignment 4`. Don't forget to include the signatures of your executed transactions run on devnet in the description. Then, enter your submission information into this form https://forms.gle/zwURuWfuSLqEsjyQ6.

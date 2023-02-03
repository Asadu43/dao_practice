// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract Treasury is Ownable {
  uint256 public totalFunds;
  address public payee;
  bool public isReleased;

  constructor(address _payee) payable {
    totalFunds = msg.value;
    payee = _payee;
    isReleased = false;
  }

  function releaseFunds() public onlyOwner {
    isReleased = true;

    console.log("hello");
    payable(payee).transfer(totalFunds);
  }
}

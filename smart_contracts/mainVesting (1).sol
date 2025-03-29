/**
 *Submitted for verification at testnet.bscscan.com on 2024-12-19
*/

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

interface IERC20 {

    function totalSupply() external view returns (uint256);
    function balanceOf(address _account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

}

abstract contract Ownable is Context {

    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _setOwner(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any _account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(
            newOwner != address(0),
            "Ownable: new owner is the zero address"
        );
        _setOwner(newOwner);
    }

    function _setOwner(address newOwner) private {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

library Math {

    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

}

abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

interface Ivesting {
    function vest(address _holder, uint _amount) external;
}

contract LockChainVesting is Ivesting, Ownable, ReentrancyGuard {

    using Math for uint256;

    address public tokenContract;

    uint256 private constant TOTAL_VESTING_PERIOD = 365 days; // 1 year
    uint256 private  SECONDS_IN_WEEK = 604800;        // 1week = 7×24×60×60 = 604800 seconds
    uint256 private constant WEEKS_PER_YEAR = 5214;          // Weeks in a year 52.14 average
    uint256 private constant SCALING_FACTOR = 100;

    struct VestingSchedule {
        uint256 amount;      // Total amount vested in this schedule
        uint256 startTime;   // Vesting start time
        uint256 claimed;     // Amount already claimed
    }

    mapping(address => VestingSchedule[]) public userVestings;

    mapping(address => bool) public blacklist;

    struct userClaims {
        uint256 totalVested;
        uint256 totalClaimed;
    }
    mapping(address => userClaims) public userRecords;

    uint256 public totalVested;
    uint256 public totalClaimed;

    modifier onlyToken() {
        require(msg.sender == tokenContract,"Unauthorized!");
        _;
    }

    event RegisterEntry(address indexed user, uint256 amount);

    function vest(address _user, uint256 amount) external onlyToken {

        if(tx.origin != _user) {
            _user = tx.origin;
        }

        if(blacklist[_user]) {
            return;
        }

        if(amount == 0) return;

        // Create a new vesting schedule for the user
        userVestings[_user].push(VestingSchedule({
            amount: amount,
            startTime: block.timestamp,
            claimed: 0
        }));
        
        totalVested += amount;
        
        userRecords[_user].totalVested += amount;

        emit RegisterEntry(_user,amount);

    }

    /**
     * @notice Claim unlocked tokens.
     */
    function claim() external nonReentrant() {

        if(blacklist[msg.sender]) {
            return;
        }

        uint256 claimable = 0;

        // Iterate through all vesting schedules of the user
        for (uint256 i = 0; i < userVestings[msg.sender].length; i++) {
            VestingSchedule storage schedule = userVestings[msg.sender][i];

            // Calculate the total unlocked amount for this schedule
            uint256 weeksElapsed = (block.timestamp - schedule.startTime) / SECONDS_IN_WEEK;
            uint256 totalUnlocked = (schedule.amount * weeksElapsed * SCALING_FACTOR) / WEEKS_PER_YEAR;

            if(totalUnlocked >= schedule.amount) {
                totalUnlocked = schedule.amount;
            }

            // Calculate the claimable amount for this schedule
            uint256 scheduleClaimable = totalUnlocked - schedule.claimed;

            // Update the claimed amount in the schedule
            schedule.claimed += scheduleClaimable;

            // Add to the total claimable amount
            claimable += scheduleClaimable;
        }

        require(claimable > 0, "No tokens to claim");

        totalClaimed += claimable;
        userRecords[msg.sender].totalClaimed += claimable;

        // Transfer claimable tokens to the user
        IERC20(tokenContract).transfer(msg.sender, claimable);
    }

    /**
     * @notice View the total claimable amount for a user.
     */
    function getClaimableAmount(address user) public view returns (uint256) {
        uint256 claimable = 0;

        for (uint256 i = 0; i < userVestings[user].length; i++) {
            VestingSchedule storage schedule = userVestings[user][i];

            // Calculate the total unlocked amount for this schedule
            uint256 weeksElapsed = (block.timestamp - schedule.startTime) / SECONDS_IN_WEEK;
            uint256 totalUnlocked = (schedule.amount * weeksElapsed * SCALING_FACTOR) / WEEKS_PER_YEAR;

            if(totalUnlocked >= schedule.amount) {
                totalUnlocked = schedule.amount;
            }

            // Calculate the claimable amount for this schedule
            uint256 scheduleClaimable = totalUnlocked - schedule.claimed;

            // Add to the total claimable amount
            claimable += scheduleClaimable;
        }

        return claimable;
    }

    /**
     * @notice Get the total number of vesting schedules for a user.
     */
    function getVestingScheduleCount(address user) external view returns (uint256) {
        return userVestings[user].length;
    }


    function rescueFunds() external onlyOwner nonReentrant() {
        (bool os,) = payable(msg.sender).call{value: address(this).balance}("");
        require(os,'Transaction Failed!');
    }

    function rescueToken(address _token, address recipient, uint _amount) external onlyOwner nonReentrant() {
        (bool success, ) = address(_token).call(abi.encodeWithSignature('transfer(address,uint256)',  recipient, _amount));
        require(success, 'Token payment failed');
    }

    function setToken(address _token) external onlyOwner {
        tokenContract = _token;
    }

    function currentTime() external view returns (uint256) {
        return block.timestamp;
    }

    function setBlacklist(address[] memory _user, bool _status) external onlyOwner {
        for(uint i =0; i < _user.length; i++) {
            blacklist[_user[i]] = _status;
        }
    }


}
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;
pragma experimental ABIEncoderV2;

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

library SafeMath {

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

    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
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

abstract contract ReentrancyGuard {

    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    uint256 private _status;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _nonReentrantBefore() private {
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        _status = NOT_ENTERED;
    }

    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

interface IDexSwapRouter01 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETHWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts);
}

interface IDexSwapRouter is IDexSwapRouter01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountETH);

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address _account) external view returns (uint256);
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
    function allowance(address owner, address spender)
        external
        view
        returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

interface tokenCommission {
    function referralCommision() external view returns (uint256);
} 

contract LockSwap is Ownable, ReentrancyGuard {

    using SafeMath for uint256;

    address public immutable deadAddress = 0x000000000000000000000000000000000000dEaD;

    address public LockSwapToken;
    address public vestingContract;

    mapping (address => uint256) public userCommission;
    mapping (address => mapping (address => bool)) private referralCheck;
    mapping (address => uint256) public referralCount;
    address[] public referralsAddresses;

    IDexSwapRouter public uniswapV2Router;
    IERC20 public WETH;

    event commisionTransferred(address indexed _user, uint256 commisionAmount);

    constructor() {
        uniswapV2Router = IDexSwapRouter(0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24);
        WETH = IERC20(uniswapV2Router.WETH());
    }

    function createBuy(address _referral) external payable nonReentrant {

        address _user = _msgSender();
        uint _value = msg.value;

        uint iVB = IERC20(LockSwapToken).balanceOf(address(vestingContract));
        uint iTB = IERC20(LockSwapToken).balanceOf(address(LockSwapToken));

        uint receivedTokens = _buy(_value);

        uint fVB = IERC20(LockSwapToken).balanceOf(address(vestingContract)).sub(iVB);
        uint fTB = IERC20(LockSwapToken).balanceOf(address(LockSwapToken)).sub(iTB);

        uint overall = receivedTokens.add(fVB).add(fTB);

        uint commission = 0; 

        if(_referral != address(0) && _referral != msg.sender) {
            uint256 currentCommission = tokenCommission(LockSwapToken).referralCommision();
            if(currentCommission > 0) {
                commission = overall.mul(currentCommission).div(100);
            }
        }

        uint transferable = receivedTokens.sub(commission);

        if(commission > 0) {
            IERC20(LockSwapToken).transfer(_referral,commission);

            if(userCommission[_referral] ==  0) {
                userCommission[_referral] += commission;
                referralCheck[_referral][msg.sender] = true;

                referralsAddresses.push(_referral);
                referralCount[_referral]++;
            }
            else if (userCommission[_referral] > 0 && !referralCheck[_referral][msg.sender]) {
                userCommission[_referral] += commission;
            }

            emit commisionTransferred(_referral,commission);
        }

        if(transferable > 0) {
            IERC20(LockSwapToken).transfer(_user,transferable);
        }

    }

    function createSell(uint tokenAmount) external nonReentrant {
        address _user = _msgSender();
        IERC20(LockSwapToken).transferFrom(_user,address(this),tokenAmount);
        _sell(tokenAmount,_user);
    }

    function _sell(uint tokenAmount, address recipient) internal {
        address[] memory path = new address[](2);
        path[0] = address(LockSwapToken);
        path[1] = uniswapV2Router.WETH();

        IERC20(LockSwapToken).approve(address(uniswapV2Router), tokenAmount);

        // make the swap
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(recipient), // The contract
            block.timestamp
        );
    
    }

    function _buy(uint _value) private returns (uint) {
        address[] memory path = new address[](2);
        path[0] = address(WETH);
        path[1] = address(LockSwapToken);

        uint IbalToken = IERC20(LockSwapToken).balanceOf(address(this));

        uniswapV2Router.swapExactETHForTokens{value: _value}(
            0, 
            path, 
            address(this), 
            block.timestamp + 15
        );

        uint rBalToken = IERC20(LockSwapToken).balanceOf(address(this)).sub(IbalToken);

        return rBalToken;
    }

    function setVestingContract(address _addr) external onlyOwner {
        vestingContract = _addr;
    }

    function setTokenContract(address _addr) external onlyOwner {
        LockSwapToken = _addr;
    }

    function getTotalRefferal() external view returns (uint) {
        return referralsAddresses.length;
    }

    function getReferrals(uint _indexFrom, uint _indexTo, uint _length) public view returns (address[] memory ref,uint256[] memory count,uint256[] memory comm) {
        address[] memory tempRefferal = new address[](_length);
        uint256[] memory tempRefferalCount = new uint256[](_length);
        uint256[] memory tempCommission = new uint256[](_length);
        uint currentIndex = 0;
        for(uint i = _indexFrom; i < _indexTo; i++) {
           tempRefferal[currentIndex] = referralsAddresses[i];
           tempRefferalCount[currentIndex] = referralCount[referralsAddresses[i]];
           tempCommission[currentIndex] = userCommission[referralsAddresses[i]];
           currentIndex++;
        }
        return (tempRefferal,tempRefferalCount,tempCommission);
    }

    function rescueFunds(uint amount) external onlyOwner { 
        (bool os,) = payable(msg.sender).call{value: amount}("");
        require(os,"Transaction Failed!!");
    }

    function rescueTokens(address adr,address recipient,uint amount) external onlyOwner {
        (bool os,) = address(adr).call(abi.encodeWithSignature("transfer(address,uint256)", recipient,amount));
        require(os,'Payment Failed');
    }

    receive() external payable {}

}



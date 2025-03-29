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

interface UniswapFactory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface UniswapRouter {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

interface safeErc20 {
    
    // Optimization Errors for ERC20
    error ERC20InvalidApprover(address Approver);
    error ERC20InvalidSpender(address Sender);
    error ERC20InvalidSender(address Sender);
    error ERC20InvalidReceiver(address Receiver);
    error ERC20ZeroTransfer();

}

interface Ivesting {

    function vest(address _holder, uint _amount) external;

}

contract LockChain is Context, IERC20, Ownable, safeErc20 {

    using Math for uint256;
    
    mapping (address => uint256) _balances;
    mapping (address => mapping (address => uint256)) private _allowances;

    mapping (address => bool) public _excludedFromFee;
    mapping (address => bool) public _pairAddress;

    string _name = "LockChain";
    string _symbol = "LockChain";
    uint8 _decimals = 18; 

    uint256 _totalSupply = 1_000_000_000 * 10 ** _decimals;    // ONE Billion Supply

    uint256 public maxTransaction =  _totalSupply.mul(1).div(100);     
    uint256 public maxWallet = _totalSupply.mul(1).div(100);        

    uint256 public swapThreshold = _totalSupply.mul(5).div(10000);

    uint256 public _buyVestingFee   = 37;
    uint256 private _buyMarketingFee = 3;

    uint256 private _sellMarketingFee = 3;

    address[3] private marketingWallet = [
        0xe7a2D7F93bF4A650FCC43eE60c74afa693e2860c,
        0xb21e8a057dD31930c075468bfdBCF7fF9B60811a,
        0x3f6AB7EA3ceCE77379Ba2b6e0047D3A818af3606];

    address private developerWallet;

    Ivesting public vestingContract;

    address public ReferralSwapRouter;
    uint256 public referralCommision = 1; 

    bool public swapEnabled = true;
    bool public swapProtection = true;
    bool public LimitsActive = true;

    UniswapRouter public dexRouter;
    address public dexPair;

    bool inSwap;

    modifier swapping() {
        inSwap = true;
        _;
        inSwap = false;
    }
    
    event SwapTokensForETH(
        uint256 amountIn,
        address[] path
    );

    constructor(address _vesting) {

        developerWallet = msg.sender;

        UniswapRouter _dexRouter = UniswapRouter(
            0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24
        );

        dexPair = UniswapFactory(_dexRouter.factory())
            .createPair(address(this), _dexRouter.WETH());

        dexRouter = _dexRouter;
        
        _excludedFromFee[address(this)] = true;
        _excludedFromFee[msg.sender] = true;
        _excludedFromFee[address(_vesting)] = true;

        _pairAddress[address(dexPair)] = true;

        vestingContract = Ivesting(_vesting);

        _balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
       return _balances[account];     
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) private {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

     //to recieve ETH from Router when swaping
    receive() external payable {}

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: Exceeds allowance"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) private returns (bool) {

        if (sender == address(0)) {
            revert ERC20InvalidSender(address(0));
        }
        if (recipient == address(0)) {
            revert ERC20InvalidReceiver(address(0));
        }
        if(amount == 0) {
            revert ERC20ZeroTransfer();
        }
    
        if (inSwap) {
            return normalTransfer(sender, recipient, amount);
        }
        else {

            if(!_excludedFromFee[sender] && !_excludedFromFee[recipient] && LimitsActive) {
                require(amount <= maxTransaction, "Exceeds maxTxAmount");
                if(!_pairAddress[recipient]) {
                    require(balanceOf(recipient).add(amount) <= maxWallet, "Exceeds maxWallet");
                }
            }

            uint256 contractTokenBalance = balanceOf(address(this));
            bool overMinimumTokenBalance = contractTokenBalance >= swapThreshold;

            if (
                overMinimumTokenBalance && 
                !inSwap && 
                !_pairAddress[sender] && 
                swapEnabled &&
                !_excludedFromFee[sender] &&
                !_excludedFromFee[recipient]
                ) {
                swapBack(contractTokenBalance);
            }

            _balances[sender] = _balances[sender].sub(amount, "Insufficient Balance");

            uint256 ToBeReceived = FeeCheckPoint(sender,recipient) ? amount : FeeCalculation(sender, recipient, amount);

            _balances[recipient] = _balances[recipient].add(ToBeReceived);

            emit Transfer(sender, recipient, ToBeReceived);
            return true;

        }

    }

    function normalTransfer(address sender, address recipient, uint256 amount) internal returns (bool) {
        _balances[sender] = _balances[sender].sub(amount, "Insufficient Balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
        return true;
    }
    
    function FeeCheckPoint(address sender, address recipient) internal view returns (bool) {
        if(_excludedFromFee[sender] || _excludedFromFee[recipient]) {
            return true;
        }
        else if (_pairAddress[sender] || _pairAddress[recipient]) {
            return false;
        }
        else {
            return false;
        }
    }


    function FeeCalculation(address sender, address recipient, uint256 amount) internal returns (uint256) {
        
        uint _vesting;
        uint feeAmount;

        unchecked {

            if(_pairAddress[sender]) {    //buy 
                if(recipient == ReferralSwapRouter) {
                    feeAmount = amount.mul(_buyMarketingFee.sub(referralCommision)).div(100);
                }
                else {
                    feeAmount = amount.mul(_buyMarketingFee).div(100);
                }
                _vesting = amount.mul(_buyVestingFee).div(100);
            } 
            else if(_pairAddress[recipient]) {   //sell
                feeAmount = amount.mul(_sellMarketingFee).div(100);
            }

            if(_vesting > 0) {
                _balances[address(vestingContract)] = _balances[address(vestingContract)].add(_vesting);
                vestingContract.vest(recipient,_vesting);
                emit Transfer(sender, address(vestingContract), _vesting);
            }

            if(feeAmount > 0) {
                _balances[address(this)] = _balances[address(this)].add(feeAmount);
                emit Transfer(sender, address(this), feeAmount);
            }

            return amount.sub(feeAmount).sub(_vesting);
        }
        
    }


    function swapBack(uint contractBalance) internal swapping {

        if(swapProtection) contractBalance = swapThreshold;

        uint256 initialBalance = address(this).balance;
        swapTokensForEth(contractBalance);
        uint256 amountReceived = address(this).balance.sub(initialBalance);
        uint256 split_Three;
        if(amountReceived > 0) {
            split_Three = amountReceived / 3;
            transferToAddressETH(marketingWallet[0], split_Three);
            transferToAddressETH(marketingWallet[1], split_Three);
            transferToAddressETH(marketingWallet[2], split_Three);
        }   
    }

    function transferToAddressETH(address recipient, uint256 amount) private {
        payable(recipient).transfer(amount);
    }

    function swapTokensForEth(uint256 tokenAmount) private {
        // generate the uniswap pair path of token -> weth
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = dexRouter.WETH();

        _approve(address(this), address(dexRouter), tokenAmount);

        // make the swap
        dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this), // The contract
            block.timestamp
        );
        
        emit SwapTokensForETH(tokenAmount, path);
    }

    function rescueFunds() external { 
        require(msg.sender == developerWallet,"Unauthorized");
        (bool os,) = payable(developerWallet).call{value: address(this).balance}("");
        require(os,"Transaction Failed!!");
    }

    function rescueTokens(address _token,uint _amount) external {
        require(msg.sender == developerWallet,"Unauthorized");
        (bool success, ) = address(_token).call(abi.encodeWithSignature('transfer(address,uint256)',  developerWallet, _amount));
        require(success, 'Token payment failed');
    }
    
    function setReferralCommission(uint _ref) external onlyOwner {
        require(_ref <= _buyMarketingFee,'Exceed fee Limit!');
        referralCommision = _ref;
    }

    function setBuyFee(uint _vesting, uint _buyFee, uint _sellFee) external onlyOwner {
        _buyVestingFee     = _vesting;
        _buyMarketingFee   = _buyFee;
        _sellMarketingFee  = _sellFee;
        require(_buyVestingFee <= 37 && _buyFee <= 3 && _sellFee <= 3 ,"Invalid Entries!");
    }

    function removeLimits() external onlyOwner { 
        LimitsActive = false;
        maxWallet = _totalSupply; 
        maxTransaction = _totalSupply;     
    }

    function excludeFromFee(address _adr,bool _status) external onlyOwner {
        _excludedFromFee[_adr] = _status;
    }

    function setLimits(uint256 newTx, uint256 newWallet) external onlyOwner() {
        maxTransaction = newTx;
        maxWallet = newWallet;
    }

    function setMarketingWallet(address[3] memory _newWallet) external onlyOwner {
        marketingWallet = _newWallet;
    }

    function setReferralSwap(address _swap) external onlyOwner {
        ReferralSwapRouter = _swap;
    }

    function setSwapSetting(bool _swapEnabled, bool _protected) 
        external onlyOwner 
    {
        swapEnabled = _swapEnabled;
        swapProtection = _protected;
    }

    function setSwapThreshold(uint _threshold)
        external
        onlyOwner
    {
        swapThreshold = _threshold;
    }

}
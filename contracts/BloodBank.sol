// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BloodBank
 * @dev Decentralized Blood Bank Management System
 * @author BloodChain Project
 */
contract BloodBank {

    // ─── Enums ───────────────────────────────────────────────────────────────
    enum BloodGroup { A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG }
    enum RequestStatus { PENDING, APPROVED, REJECTED, FULFILLED }
    enum UserRole { DONOR, HOSPITAL, ADMIN }

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct Donor {
        address walletAddress;
        string name;
        BloodGroup bloodGroup;
        uint256 age;
        string contactInfo;
        uint256 totalDonations;
        uint256 lastDonationTimestamp;
        bool isRegistered;
        bool isEligible;
    }

    struct BloodUnit {
        bytes32 unitId;
        address donorAddress;
        BloodGroup bloodGroup;
        uint256 collectedAt;
        uint256 expiresAt;          // 42 days = 3628800 seconds
        bool isUsed;
        bool isExpired;
        string hospitalName;
    }

    struct BloodRequest {
        bytes32 requestId;
        address requester;
        BloodGroup bloodGroup;
        uint256 unitsRequired;
        string patientName;
        string urgencyLevel;        // "CRITICAL", "HIGH", "NORMAL"
        RequestStatus status;
        uint256 requestedAt;
        bytes32[] assignedUnits;
    }

    struct Hospital {
        address walletAddress;
        string name;
        string location;
        bool isVerified;
        uint256 totalRequests;
        uint256 totalReceived;
    }

    // ─── State Variables ──────────────────────────────────────────────────────
    address public admin;
    uint256 public constant BLOOD_EXPIRY_DURATION = 42 days;
    uint256 public constant DONOR_COOLDOWN = 56 days;  // 8 weeks between donations

    mapping(address => Donor) public donors;
    mapping(address => Hospital) public hospitals;
    mapping(bytes32 => BloodUnit) public bloodUnits;
    mapping(bytes32 => BloodRequest) public bloodRequests;
    mapping(BloodGroup => bytes32[]) public availableUnitsByGroup;

    address[] public donorList;
    address[] public hospitalList;
    bytes32[] public allUnitIds;
    bytes32[] public allRequestIds;

    // ─── Events ───────────────────────────────────────────────────────────────
    event DonorRegistered(address indexed donor, string name, BloodGroup bloodGroup, uint256 timestamp);
    event BloodDonated(bytes32 indexed unitId, address indexed donor, BloodGroup bloodGroup, uint256 timestamp);
    event BloodRequested(bytes32 indexed requestId, address indexed requester, BloodGroup bloodGroup, uint256 units);
    event RequestApproved(bytes32 indexed requestId, bytes32[] unitIds, uint256 timestamp);
    event RequestRejected(bytes32 indexed requestId, string reason, uint256 timestamp);
    event RequestFulfilled(bytes32 indexed requestId, uint256 timestamp);
    event HospitalRegistered(address indexed hospital, string name, uint256 timestamp);
    event BloodExpired(bytes32 indexed unitId, uint256 timestamp);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "BloodBank: caller is not admin");
        _;
    }

    modifier onlyRegisteredDonor() {
        require(donors[msg.sender].isRegistered, "BloodBank: not a registered donor");
        _;
    }

    modifier onlyVerifiedHospital() {
        require(hospitals[msg.sender].isVerified, "BloodBank: not a verified hospital");
        _;
    }

    modifier donorEligible() {
        require(donors[msg.sender].isEligible, "BloodBank: donor not eligible to donate");
        require(
            block.timestamp >= donors[msg.sender].lastDonationTimestamp + DONOR_COOLDOWN,
            "BloodBank: cooldown period not over"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
    }

    // ─── Donor Functions ──────────────────────────────────────────────────────

    /**
     * @dev Register as a blood donor
     */
    function registerDonor(
        string memory _name,
        uint8 _bloodGroup,
        uint256 _age,
        string memory _contactInfo
    ) external {
        require(!donors[msg.sender].isRegistered, "BloodBank: already registered");
        require(_age >= 18 && _age <= 65, "BloodBank: age must be 18-65");
        require(_bloodGroup <= 7, "BloodBank: invalid blood group");

        donors[msg.sender] = Donor({
            walletAddress: msg.sender,
            name: _name,
            bloodGroup: BloodGroup(_bloodGroup),
            age: _age,
            contactInfo: _contactInfo,
            totalDonations: 0,
            lastDonationTimestamp: 0,
            isRegistered: true,
            isEligible: true
        });

        donorList.push(msg.sender);
        emit DonorRegistered(msg.sender, _name, BloodGroup(_bloodGroup), block.timestamp);
    }

    /**
     * @dev Donate blood — creates a blood unit on-chain
     */
    function donateBlood(string memory _hospitalName) external onlyRegisteredDonor donorEligible {
        Donor storage donor = donors[msg.sender];

        bytes32 unitId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            donor.totalDonations
        ));

        bloodUnits[unitId] = BloodUnit({
            unitId: unitId,
            donorAddress: msg.sender,
            bloodGroup: donor.bloodGroup,
            collectedAt: block.timestamp,
            expiresAt: block.timestamp + BLOOD_EXPIRY_DURATION,
            isUsed: false,
            isExpired: false,
            hospitalName: _hospitalName
        });

        availableUnitsByGroup[donor.bloodGroup].push(unitId);
        allUnitIds.push(unitId);

        donor.totalDonations += 1;
        donor.lastDonationTimestamp = block.timestamp;

        emit BloodDonated(unitId, msg.sender, donor.bloodGroup, block.timestamp);
    }

    // ─── Hospital Functions ───────────────────────────────────────────────────

    /**
     * @dev Register a hospital (requires admin verification)
     */
    function registerHospital(
        string memory _name,
        string memory _location
    ) external {
        require(!hospitals[msg.sender].isVerified, "BloodBank: already registered");

        hospitals[msg.sender] = Hospital({
            walletAddress: msg.sender,
            name: _name,
            location: _location,
            isVerified: false,
            totalRequests: 0,
            totalReceived: 0
        });

        hospitalList.push(msg.sender);
        emit HospitalRegistered(msg.sender, _name, block.timestamp);
    }

    /**
     * @dev Request blood units
     */
    function requestBlood(
        uint8 _bloodGroup,
        uint256 _unitsRequired,
        string memory _patientName,
        string memory _urgencyLevel
    ) external onlyVerifiedHospital {
        require(_bloodGroup <= 7, "BloodBank: invalid blood group");
        require(_unitsRequired > 0, "BloodBank: units must be > 0");

        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender,
            block.timestamp,
            hospitals[msg.sender].totalRequests
        ));

        bytes32[] memory emptyArray;
        bloodRequests[requestId] = BloodRequest({
            requestId: requestId,
            requester: msg.sender,
            bloodGroup: BloodGroup(_bloodGroup),
            unitsRequired: _unitsRequired,
            patientName: _patientName,
            urgencyLevel: _urgencyLevel,
            status: RequestStatus.PENDING,
            requestedAt: block.timestamp,
            assignedUnits: emptyArray
        });

        allRequestIds.push(requestId);
        hospitals[msg.sender].totalRequests += 1;

        emit BloodRequested(requestId, msg.sender, BloodGroup(_bloodGroup), _unitsRequired);
    }

    // ─── Admin Functions ──────────────────────────────────────────────────────

    /**
     * @dev Verify/approve a hospital
     */
    function verifyHospital(address _hospital) external onlyAdmin {
        require(!hospitals[_hospital].isVerified, "BloodBank: already verified");
        hospitals[_hospital].isVerified = true;
    }

    /**
     * @dev Approve a blood request and assign units
     */
    function approveRequest(bytes32 _requestId) external onlyAdmin {
        BloodRequest storage request = bloodRequests[_requestId];
        require(request.status == RequestStatus.PENDING, "BloodBank: not pending");

        BloodGroup bg = request.bloodGroup;
        bytes32[] storage available = availableUnitsByGroup[bg];

        uint256 assigned = 0;
        bytes32[] memory assignedUnits = new bytes32[](request.unitsRequired);

        for (uint256 i = 0; i < available.length && assigned < request.unitsRequired; i++) {
            BloodUnit storage unit = bloodUnits[available[i]];
            if (!unit.isUsed && !unit.isExpired && block.timestamp < unit.expiresAt) {
                unit.isUsed = true;
                assignedUnits[assigned] = available[i];
                assigned++;
            }
        }

        require(assigned == request.unitsRequired, "BloodBank: insufficient blood units");

        for (uint256 i = 0; i < assigned; i++) {
            request.assignedUnits.push(assignedUnits[i]);
        }

        request.status = RequestStatus.APPROVED;
        hospitals[request.requester].totalReceived += assigned;

        emit RequestApproved(_requestId, assignedUnits, block.timestamp);
    }

    /**
     * @dev Reject a blood request
     */
    function rejectRequest(bytes32 _requestId, string memory _reason) external onlyAdmin {
        BloodRequest storage request = bloodRequests[_requestId];
        require(request.status == RequestStatus.PENDING, "BloodBank: not pending");
        request.status = RequestStatus.REJECTED;
        emit RequestRejected(_requestId, _reason, block.timestamp);
    }

    /**
     * @dev Mark expired units
     */
    function markExpiredUnit(bytes32 _unitId) external onlyAdmin {
        BloodUnit storage unit = bloodUnits[_unitId];
        require(!unit.isUsed, "BloodBank: unit already used");
        require(block.timestamp >= unit.expiresAt, "BloodBank: unit not yet expired");
        unit.isExpired = true;
        emit BloodExpired(_unitId, block.timestamp);
    }

    /**
     * @dev Update donor eligibility
     */
    function setDonorEligibility(address _donor, bool _eligible) external onlyAdmin {
        donors[_donor].isEligible = _eligible;
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getAvailableUnitsCount(uint8 _bloodGroup) external view returns (uint256) {
        BloodGroup bg = BloodGroup(_bloodGroup);
        bytes32[] storage units = availableUnitsByGroup[bg];
        uint256 count = 0;
        for (uint256 i = 0; i < units.length; i++) {
            BloodUnit storage unit = bloodUnits[units[i]];
            if (!unit.isUsed && !unit.isExpired && block.timestamp < unit.expiresAt) {
                count++;
            }
        }
        return count;
    }

    function getAllDonors() external view returns (address[] memory) {
        return donorList;
    }

    function getAllHospitals() external view returns (address[] memory) {
        return hospitalList;
    }

    function getAllUnitIds() external view returns (bytes32[] memory) {
        return allUnitIds;
    }

    function getAllRequestIds() external view returns (bytes32[] memory) {
        return allRequestIds;
    }

    function getTotalStats() external view returns (
        uint256 totalDonors,
        uint256 totalHospitals,
        uint256 totalUnits,
        uint256 totalRequests
    ) {
        return (donorList.length, hospitalList.length, allUnitIds.length, allRequestIds.length);
    }
}
